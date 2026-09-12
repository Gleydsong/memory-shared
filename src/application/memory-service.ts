import { createHash, randomUUID } from "node:crypto";

import type { AgentMemoryProvider } from "../domain/agent-memory-provider.js";
import type {
  AgentHandoff,
  MemoryRecord,
  MemoryScope,
  RememberInput,
  SearchRequest,
} from "../domain/memory.js";
import {
  assertSafeMemoryContent,
  assertSafeScope,
  assertWritableScope,
  normalizeMemoryText,
} from "../security/memory-guard.js";

export type MemoryServiceConfig = {
  workingTtlSeconds: number;
  maxResults: number;
  minRelevance: number;
  maxContextTokens: number;
  maxContentBytes: number;
};

const DEFAULT_CONFIG: MemoryServiceConfig = {
  workingTtlSeconds: 21_600,
  maxResults: 7,
  minRelevance: 0.25,
  maxContextTokens: 2_000,
  maxContentBytes: 16_384,
};

export class MemoryService {
  readonly #provider: AgentMemoryProvider;
  readonly #config: MemoryServiceConfig;

  constructor(provider: AgentMemoryProvider, config: Partial<MemoryServiceConfig> = {}) {
    this.#provider = provider;
    this.#config = validateConfig({ ...DEFAULT_CONFIG, ...config });
  }

  async remember(input: RememberInput): Promise<MemoryRecord> {
    this.#validateInput(input);
    const fingerprint = fingerprintFor(input);
    const duplicate = (
      await this.#provider.search({
        scope: input.scope,
        query: `${input.title} ${input.content}`,
        types: [input.type],
        statuses: ["active"],
        limit: this.#config.maxResults,
        minRelevance: 0,
        searchMode: this.#provider.capabilities.hybridSearch ? "hybrid" : "semantic",
      })
    ).find((memory) => memory.metadata.fingerprint === fingerprint);

    const now = new Date().toISOString();
    if (duplicate) {
      return this.#provider.update({
        ...duplicate,
        title: input.title.trim(),
        content: input.content.trim(),
        metadata: {
          ...duplicate.metadata,
          ...input.metadata,
          fingerprint,
          updatedAt: now,
        },
      });
    }

    const record: MemoryRecord = {
      id: randomUUID(),
      workspaceId: input.scope.workspaceId,
      ...(input.scope.projectId ? { projectId: input.scope.projectId } : {}),
      namespace: input.scope.namespace,
      type: input.type,
      title: input.title.trim(),
      content: input.content.trim(),
      status: "active",
      metadata: {
        ...input.metadata,
        ...(input.metadata.agent ? {} : { agent: input.scope.agentId }),
        ...(input.scope.runId ? { runId: input.scope.runId } : {}),
        ...(input.scope.taskId ? { taskId: input.scope.taskId } : {}),
        fingerprint,
        createdAt: now,
        updatedAt: now,
      },
    };
    return this.#provider.remember(record);
  }

  async search(request: SearchRequest): Promise<MemoryRecord[]> {
    assertSafeScope(request.scope);
    assertSafeMemoryContent(request.query, this.#config.maxContentBytes);
    const limit = Math.min(request.limit ?? this.#config.maxResults, this.#config.maxResults);
    const minRelevance = Math.max(request.minRelevance ?? this.#config.minRelevance, this.#config.minRelevance);
    const results = await this.#provider.search({
      ...request,
      statuses: request.statuses ?? ["active"],
      limit,
      minRelevance,
      searchMode:
        request.searchMode ?? (this.#provider.capabilities.hybridSearch ? "hybrid" : "semantic"),
    });
    return fitContextBudget(
      results.map((memory) => ({
        ...memory,
        ...(request.currentCommit && memory.metadata.sourceCommit !== request.currentCommit
          ? { possiblyStale: true }
          : {}),
      })),
      this.#config.maxContextTokens,
    );
  }

  async supersede(id: string, replacement: RememberInput): Promise<MemoryRecord> {
    const previous = await this.#provider.get(id, replacement.scope);
    if (!previous) {
      throw new Error("Memory to supersede was not found in this scope");
    }
    this.#validateInput(replacement);
    if (previous.metadata.fingerprint === fingerprintFor(replacement)) {
      throw new Error("Replacement must differ from the memory it supersedes");
    }
    const current = await this.remember(replacement);
    try {
      await this.#provider.update({ ...previous, status: "superseded", supersededBy: current.id });
    } catch (error) {
      await this.#provider.forget([current.id], replacement.scope).catch(() => undefined);
      throw error;
    }
    return current;
  }

  async forget(ids: string[], scope: MemoryScope): Promise<void> {
    assertWritableScope(scope);
    await this.#provider.forget(ids, scope);
  }

  async getWorkingMemory(scope: MemoryScope): Promise<Record<string, unknown> | null> {
    assertSafeScope(scope);
    return (await this.#provider.getWorkingMemory(scope))?.data ?? null;
  }

  async setWorkingMemory(scope: MemoryScope, data: Record<string, unknown>): Promise<void> {
    assertWritableScope(scope);
    assertSafeMemoryContent(JSON.stringify(data), this.#config.maxContentBytes);
    await this.#provider.setWorkingMemory({
      scope,
      data,
      ttlSeconds: this.#config.workingTtlSeconds,
      updatedAt: new Date().toISOString(),
    });
  }

  async clearWorkingMemory(scope: MemoryScope): Promise<void> {
    assertWritableScope(scope);
    await this.#provider.deleteWorkingMemory(scope);
  }

  async createHandoff(scope: MemoryScope, handoff: Omit<AgentHandoff, "timestamp">): Promise<MemoryRecord> {
    assertWritableScope(scope);
    if (scope.projectId !== handoff.projectId) {
      throw new Error("Handoff project must match the memory scope");
    }
    assertSafeMemoryContent(JSON.stringify(handoff), this.#config.maxContentBytes);
    return this.#provider.createHandoff(
      { ...handoff, timestamp: new Date().toISOString() },
      scope,
    );
  }

  async health() {
    return this.#provider.health();
  }

  #validateInput(input: RememberInput): void {
    assertWritableScope(input.scope);
    assertSafeMemoryContent(
      JSON.stringify({ title: input.title, content: input.content, metadata: input.metadata }),
      this.#config.maxContentBytes,
    );
    if (input.metadata.confidence !== undefined && (input.metadata.confidence < 0 || input.metadata.confidence > 1)) {
      throw new Error("Memory confidence must be between 0 and 1");
    }
    if (
      input.metadata.source === "external" &&
      input.metadata.trustLevel !== "external" &&
      input.metadata.trustLevel !== "unverified"
    ) {
      throw new Error("External memory must remain external or unverified until validated");
    }
  }
}

function fingerprintFor(input: RememberInput): string {
  return createHash("sha256")
    .update(
      [input.scope.workspaceId, input.scope.projectId ?? "global", input.scope.namespace, input.type, input.title, input.content]
        .map(normalizeMemoryText)
        .join("\u0000"),
    )
    .digest("hex");
}

function fitContextBudget(memories: MemoryRecord[], maxTokens: number): MemoryRecord[] {
  const selected: MemoryRecord[] = [];
  let used = 0;
  for (const memory of memories) {
    const estimatedTokens = Math.ceil((memory.title.length + memory.content.length) / 4);
    if (used + estimatedTokens > maxTokens) continue;
    selected.push(memory);
    used += estimatedTokens;
  }
  return selected;
}

function validateConfig(config: MemoryServiceConfig): MemoryServiceConfig {
  if (
    !Number.isInteger(config.workingTtlSeconds) ||
    config.workingTtlSeconds <= 0 ||
    !Number.isInteger(config.maxResults) ||
    config.maxResults <= 0 ||
    config.minRelevance < 0 ||
    config.minRelevance > 1 ||
    !Number.isInteger(config.maxContextTokens) ||
    config.maxContextTokens <= 0 ||
    !Number.isInteger(config.maxContentBytes) ||
    config.maxContentBytes <= 0
  ) {
    throw new Error("Invalid memory configuration");
  }
  return config;
}
