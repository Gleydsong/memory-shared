import { createHash, randomUUID } from "node:crypto";
import { connect as connectTcp } from "node:net";
import { connect as connectTls } from "node:tls";

import type { AgentMemoryProvider } from "../domain/agent-memory-provider.js";
import type {
  AgentHandoff,
  HealthStatus,
  MemoryRecord,
  MemoryScope,
  ProviderCapabilities,
  SearchRequest,
  WorkingMemory,
} from "../domain/memory.js";
import { MEMORY_TYPES } from "../domain/memory.js";
import { assertSafeMemoryContent, assertSafeScope } from "../security/memory-guard.js";
import { z } from "zod";

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type RedisAgentMemoryAdapterConfig = {
  baseUrl: string;
  apiKey?: string;
  redisUrl?: string;
  maxContentBytes?: number;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseMs?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerCooldownMs?: number;
  fetcher?: Fetcher;
  now?: () => number;
};

const ENVELOPE_PREFIX = "SHARED_MEMORY_V1\n";

export class MemoryProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemoryProviderUnavailableError";
  }
}

export class RedisAgentMemoryAdapter implements AgentMemoryProvider {
  readonly name = "redis-agent-memory-v0";
  readonly capabilities: ProviderCapabilities = {
    semanticSearch: true,
    keywordSearch: true,
    hybridSearch: true,
    metadataFiltering: true,
    extraction: true,
    summarization: true,
    deduplication: true,
  };

  readonly #baseUrl: string;
  readonly #apiKey: string | undefined;
  readonly #redisUrl: string | undefined;
  readonly #maxContentBytes: number;
  readonly #timeoutMs: number;
  readonly #maxRetries: number;
  readonly #retryBaseMs: number;
  readonly #circuitBreakerThreshold: number;
  readonly #circuitBreakerCooldownMs: number;
  readonly #fetcher: Fetcher;
  readonly #now: () => number;
  #consecutiveFailures = 0;
  #circuitOpenUntil = 0;

  constructor(config: RedisAgentMemoryAdapterConfig) {
    const url = new URL(config.baseUrl);
    this.#baseUrl = url.toString().replace(/\/$/, "");
    this.#apiKey = config.apiKey;
    this.#redisUrl = config.redisUrl;
    this.#maxContentBytes = config.maxContentBytes ?? 16_384;
    this.#timeoutMs = config.timeoutMs ?? 3_000;
    this.#maxRetries = config.maxRetries ?? 2;
    this.#retryBaseMs = config.retryBaseMs ?? 100;
    this.#circuitBreakerThreshold = config.circuitBreakerThreshold ?? 5;
    this.#circuitBreakerCooldownMs = config.circuitBreakerCooldownMs ?? 30_000;
    this.#fetcher = config.fetcher ?? fetch;
    this.#now = config.now ?? Date.now;
  }

  async search(request: SearchRequest): Promise<MemoryRecord[]> {
    const body: Record<string, unknown> = {
      text: request.query,
      user_id: { eq: ownerId(request.scope) },
      search_mode: request.searchMode ?? "semantic",
      limit: request.limit ?? 10,
    };
    if (request.scope.namespace !== "*") body.namespace = { eq: request.scope.namespace };
    if (request.types?.length) body.topics = { any: request.types.map((type) => `shared-memory:type:${type}`) };
    const response = await this.#request("/v1/long-term-memory/search", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const rows = extractRows(response);
    return rows
      .map((row) => ({ memory: decodeMemory(row, this.#maxContentBytes), relevance: relevanceFor(row) }))
      .filter((item): item is { memory: MemoryRecord; relevance: number } => item.memory !== null)
      .filter(({ memory }) => sameProject(memory, request.scope))
      .filter(({ memory }) => request.scope.namespace === "*" || memory.namespace === request.scope.namespace)
      .filter(({ memory }) => !request.statuses || request.statuses.includes(memory.status))
      .map(({ memory, relevance }) => ({ ...memory, relevance }))
      .filter((memory) => (memory.relevance ?? 0) >= (request.minRelevance ?? 0))
      .slice(0, request.limit ?? 10);
  }

  async remember(memory: MemoryRecord): Promise<MemoryRecord> {
    const response = await this.#request("/v1/long-term-memory/", {
      method: "POST",
      body: JSON.stringify({ memories: [encodeMemory(memory)], deduplicate: true }),
    });
    return decodeCreatedMemory(response, memory, this.#maxContentBytes);
  }

  async get(id: string, scope: MemoryScope): Promise<MemoryRecord | null> {
    try {
      const response = await this.#request(`/v1/long-term-memory/${encodeURIComponent(id)}`, { method: "GET" });
      const memory = decodeMemory(asRecord(response), this.#maxContentBytes);
      return memory && sameProject(memory, scope) && (scope.namespace === "*" || memory.namespace === scope.namespace)
        ? memory
        : null;
    } catch (error) {
      if (error instanceof HttpProviderError && error.status === 404) return null;
      throw error;
    }
  }

  async update(memory: MemoryRecord): Promise<MemoryRecord> {
    const response = await this.#request(`/v1/long-term-memory/${encodeURIComponent(memory.id)}`, {
      method: "PATCH",
      body: JSON.stringify(encodeMemory(memory)),
    });
    return decodeMemory(asRecord(response), this.#maxContentBytes) ?? memory;
  }

  async forget(ids: string[], scope: MemoryScope): Promise<void> {
    for (const id of ids) {
      if (!(await this.get(id, scope))) throw new Error("Memory not found in requested scope");
    }
    const query = ids.map((id) => `memory_ids=${encodeURIComponent(id)}`).join("&");
    await this.#request(`/v1/long-term-memory?${query}`, { method: "DELETE" });
  }

  async getWorkingMemory(scope: MemoryScope): Promise<WorkingMemory | null> {
    const sessionId = requireSessionId(scope);
    try {
      const response = asRecord(
        await this.#request(`/v1/working-memory/${encodeURIComponent(sessionId)}`, { method: "GET" }),
      );
      if (response.user_id !== ownerId(scope) || response.namespace !== scope.namespace) return null;
      const data = asRecord(response.data ?? {});
      assertSafeMemoryContent(JSON.stringify(data), this.#maxContentBytes);
      return {
        scope,
        data,
        ttlSeconds: typeof response.ttl_seconds === "number" ? response.ttl_seconds : 0,
        updatedAt: typeof response.updated_at === "string" ? response.updated_at : new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpProviderError && error.status === 404) return null;
      throw error;
    }
  }

  async setWorkingMemory(memory: WorkingMemory): Promise<void> {
    const sessionId = requireSessionId(memory.scope);
    await this.#request(`/v1/working-memory/${encodeURIComponent(sessionId)}`, {
      method: "PUT",
      body: JSON.stringify({
        user_id: ownerId(memory.scope),
        namespace: memory.scope.namespace,
        data: memory.data,
        ttl_seconds: memory.ttlSeconds,
      }),
    });
  }

  async deleteWorkingMemory(scope: MemoryScope): Promise<void> {
    const sessionId = requireSessionId(scope);
    await this.#request(`/v1/working-memory/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
  }

  async createHandoff(handoff: AgentHandoff, scope: MemoryScope): Promise<MemoryRecord> {
    const record: MemoryRecord = {
      id: randomUUID(),
      workspaceId: scope.workspaceId,
      projectId: handoff.projectId,
      namespace: "handoffs",
      type: "handoff",
      title: `Handoff from ${handoff.fromAgent}`,
      content: JSON.stringify(handoff),
      status: "active",
      metadata: {
        agent: handoff.fromAgent,
        ...(handoff.runId ? { runId: handoff.runId } : {}),
        ...(handoff.taskId ? { taskId: handoff.taskId } : {}),
        source: sourceForAgent(handoff.fromAgent),
        trustLevel: "verified",
        ...(handoff.commit ? { sourceCommit: handoff.commit } : {}),
        createdAt: handoff.timestamp,
        updatedAt: handoff.timestamp,
        fingerprint: createHash("sha256").update(JSON.stringify(handoff)).digest("hex"),
      },
    };
    return this.remember(record);
  }

  async health(): Promise<HealthStatus> {
    const started = this.#now();
    try {
      const providerHealth = asRecord(await this.#request("/v1/health", { method: "GET" }));
      const providerStatus = providerHealth.status;
      if (
        typeof providerHealth.now !== "number" &&
        providerStatus !== "healthy" &&
        providerStatus !== "ok"
      ) {
        throw new Error("Memory provider health payload is invalid");
      }
      const redis = this.#redisUrl ? await pingRedis(this.#redisUrl, this.#timeoutMs) : "unknown";
      return {
        status: redis === "unhealthy" ? "degraded" : "healthy",
        provider: this.name,
        redis,
        latencyMs: Math.max(0, this.#now() - started),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        provider: this.name,
        redis: "unknown",
        latencyMs: Math.max(0, this.#now() - started),
        detail: error instanceof Error ? error.message : "Unknown provider error",
      };
    }
  }

  async #request(path: string, init: RequestInit): Promise<unknown> {
    if (this.#circuitOpenUntil > this.#now()) {
      throw new MemoryProviderUnavailableError("Memory provider circuit is open");
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.#maxRetries; attempt += 1) {
      try {
        const response = await this.#fetcher(`${this.#baseUrl}${path}`, {
          ...init,
          headers: {
            "content-type": "application/json",
            ...(this.#apiKey ? { authorization: `Bearer ${this.#apiKey}` } : {}),
            ...init.headers,
          },
          signal: AbortSignal.timeout(this.#timeoutMs),
        });
        if (!response.ok) {
          throw new HttpProviderError(response.status, `Memory provider returned HTTP ${response.status}`);
        }
        this.#consecutiveFailures = 0;
        this.#circuitOpenUntil = 0;
        if (response.status === 204) return null;
        return await response.json();
      } catch (error) {
        lastError = error;
        if (error instanceof HttpProviderError && error.status < 500) throw error;
        if (attempt < this.#maxRetries) await delay(this.#retryBaseMs * 2 ** attempt);
      }
    }

    this.#consecutiveFailures += 1;
    if (this.#consecutiveFailures >= this.#circuitBreakerThreshold) {
      this.#circuitOpenUntil = this.#now() + this.#circuitBreakerCooldownMs;
    }
    throw new MemoryProviderUnavailableError(
      `Memory provider unavailable: ${lastError instanceof Error ? lastError.message : "unknown error"}`,
    );
  }
}

async function pingRedis(urlValue: string, timeoutMs: number): Promise<"healthy" | "unhealthy"> {
  const url = new URL(urlValue);
  const port = Number(url.port || (url.protocol === "rediss:" ? 6380 : 6379));
  return new Promise((resolve) => {
    const done = (result: "healthy" | "unhealthy") => {
      socket.destroy();
      resolve(result);
    };
    const socket =
      url.protocol === "rediss:"
        ? connectTls({ host: url.hostname, port, servername: url.hostname })
        : connectTcp({ host: url.hostname, port });
    socket.setTimeout(timeoutMs);
    socket.once("error", () => done("unhealthy"));
    socket.once("timeout", () => done("unhealthy"));
    socket.once("connect", () => {
      const password = decodeURIComponent(url.password);
      const username = decodeURIComponent(url.username);
      const commands = password
        ? `${redisCommand(username ? ["AUTH", username, password] : ["AUTH", password])}${redisCommand(["PING"])}`
        : redisCommand(["PING"]);
      socket.write(commands);
    });
    let response = "";
    socket.on("data", (chunk: Buffer) => {
      response += chunk.toString("utf8");
      if (response.includes("+PONG\r\n")) done("healthy");
      else if (response.startsWith("-")) done("unhealthy");
    });
  });
}

function redisCommand(parts: string[]): string {
  return `*${parts.length}\r\n${parts.map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`).join("")}`;
}

class HttpProviderError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function encodeMemory(memory: MemoryRecord): Record<string, unknown> {
  const persistent = persistentMemory(memory);
  return {
    id: memory.id,
    text: `${ENVELOPE_PREFIX}${JSON.stringify(persistent)}`,
    memory_type: "semantic",
    user_id: `${memory.workspaceId}/${memory.projectId ?? "global"}`,
    namespace: memory.namespace,
    topics: [`shared-memory:type:${memory.type}`, `shared-memory:status:${memory.status}`],
    entities: memory.metadata.files ?? [],
  };
}

function persistentMemory(memory: MemoryRecord): Omit<MemoryRecord, "relevance" | "possiblyStale"> {
  return {
    id: memory.id,
    workspaceId: memory.workspaceId,
    ...(memory.projectId ? { projectId: memory.projectId } : {}),
    namespace: memory.namespace,
    type: memory.type,
    title: memory.title,
    content: memory.content,
    status: memory.status,
    ...(memory.supersededBy ? { supersededBy: memory.supersededBy } : {}),
    metadata: { ...memory.metadata },
  };
}

function decodeCreatedMemory(response: unknown, fallback: MemoryRecord, maxContentBytes: number): MemoryRecord {
  const row = extractRows(response)[0] ?? asRecord(response);
  const decoded = decodeMemory(row, maxContentBytes);
  if (decoded) return decoded;
  return { ...fallback, ...(typeof row.id === "string" ? { id: row.id } : {}) };
}

function decodeMemory(value: Record<string, unknown>, maxContentBytes: number): MemoryRecord | null {
  if (typeof value.text !== "string" || !value.text.startsWith(ENVELOPE_PREFIX)) return null;
  try {
    const parsed = memoryRecordSchema.safeParse(JSON.parse(value.text.slice(ENVELOPE_PREFIX.length)));
    if (!parsed.success) return null;
    const memory = { ...parsed.data, ...(typeof value.id === "string" ? { id: value.id } : {}) };
    assertSafeScope({
      workspaceId: memory.workspaceId,
      ...(memory.projectId ? { projectId: memory.projectId } : {}),
      namespace: memory.namespace,
      agentId: memory.metadata.agent ?? "provider",
    });
    assertSafeMemoryContent(
      JSON.stringify({ title: memory.title, content: memory.content, metadata: memory.metadata }),
      maxContentBytes,
    );
    return memory;
  } catch {
    return null;
  }
}

function extractRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.map(asRecord);
  const record = asRecord(value);
  for (const key of ["memories", "results", "items"]) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).map(asRecord);
  }
  return [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function ownerId(scope: MemoryScope): string {
  return `${scope.workspaceId}/${scope.projectId ?? "global"}`;
}

function sameProject(memory: MemoryRecord, scope: MemoryScope): boolean {
  return memory.workspaceId === scope.workspaceId && memory.projectId === scope.projectId;
}

function requireSessionId(scope: MemoryScope): string {
  if (!scope.sessionId) throw new Error("Working memory requires sessionId");
  const scopeHash = createHash("sha256")
    .update([ownerId(scope), scope.namespace, scope.agentId].join("\u0000"))
    .digest("hex")
    .slice(0, 16);
  return `sm:${scopeHash}:${scope.sessionId}`;
}

const metadataSchema = z.object({
  agent: z.string().max(128).optional(),
  runId: z.string().max(128).optional(),
  taskId: z.string().max(128).optional(),
  feature: z.string().max(256).optional(),
  files: z.array(z.string().max(1_024)).max(100).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(["user", "repository", "codex", "grok", "composer", "orca", "external"]),
  trustLevel: z.enum(["trusted", "verified", "unverified", "external"]),
  repository: z.string().max(1_024).optional(),
  branch: z.string().max(256).optional(),
  sourceCommit: z.string().max(128).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  fingerprint: z.string().min(1).max(256),
}).strict();

const memoryRecordSchema = z.object({
  id: z.string().min(1).max(256),
  workspaceId: z.string().min(1).max(128),
  projectId: z.string().min(1).max(128).optional(),
  namespace: z.string().min(1).max(128),
  type: z.enum(MEMORY_TYPES),
  title: z.string().min(1).max(256),
  content: z.string().min(1).max(1_048_576),
  status: z.enum(["active", "superseded", "deprecated"]),
  supersededBy: z.string().max(256).optional(),
  metadata: metadataSchema,
}).strict();

function relevanceFor(value: unknown): number {
  const record = asRecord(value);
  if (typeof record.score === "number") return record.score;
  if (typeof record.similarity === "number") return record.similarity;
  if (typeof record.dist === "number") return Math.max(0, Math.min(1, 1 - record.dist));
  return 1;
}

function sourceForAgent(agent: string): "codex" | "grok" | "composer" | "orca" | "external" {
  return agent === "codex" || agent === "grok" || agent === "composer" || agent === "orca" ? agent : "external";
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
