import { createHash, randomUUID } from "node:crypto";

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

type ExpiringWorkingMemory = WorkingMemory & { expiresAt: number };

export class InMemoryAgentMemoryAdapter implements AgentMemoryProvider {
  readonly name = "in-memory";
  readonly capabilities: ProviderCapabilities = {
    semanticSearch: false,
    keywordSearch: true,
    hybridSearch: false,
    metadataFiltering: true,
    extraction: false,
    summarization: false,
    deduplication: false,
  };

  readonly #memories = new Map<string, MemoryRecord>();
  readonly #working = new Map<string, ExpiringWorkingMemory>();

  async search(request: SearchRequest): Promise<MemoryRecord[]> {
    const terms = tokenize(request.query);
    const statuses = request.statuses ?? ["active"];
    return [...this.#memories.values()]
      .filter((memory) => sameProject(memory, request.scope))
      .filter((memory) => request.scope.namespace === "*" || memory.namespace === request.scope.namespace)
      .filter((memory) => statuses.includes(memory.status))
      .filter((memory) => !request.types || request.types.includes(memory.type))
      .map((memory) => ({ ...memory, relevance: score(memory, terms) }))
      .filter((memory) => (memory.relevance ?? 0) >= (request.minRelevance ?? 0))
      .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))
      .slice(0, request.limit ?? 10);
  }

  async remember(memory: MemoryRecord): Promise<MemoryRecord> {
    this.#memories.set(memory.id, structuredClone(memory));
    return structuredClone(memory);
  }

  async get(id: string, scope: MemoryScope): Promise<MemoryRecord | null> {
    const memory = this.#memories.get(id);
    return memory && sameProject(memory, scope) && (scope.namespace === "*" || memory.namespace === scope.namespace)
      ? structuredClone(memory)
      : null;
  }

  async update(memory: MemoryRecord): Promise<MemoryRecord> {
    if (!this.#memories.has(memory.id)) throw new Error("Memory not found");
    this.#memories.set(memory.id, structuredClone(memory));
    return structuredClone(memory);
  }

  async forget(ids: string[], scope: MemoryScope): Promise<void> {
    for (const id of ids) {
      const memory = this.#memories.get(id);
      if (memory && sameProject(memory, scope) && (scope.namespace === "*" || memory.namespace === scope.namespace)) {
        this.#memories.delete(id);
      }
    }
  }

  async getWorkingMemory(scope: MemoryScope): Promise<WorkingMemory | null> {
    const key = workingKey(scope);
    const memory = this.#working.get(key);
    if (!memory || memory.expiresAt <= Date.now()) {
      this.#working.delete(key);
      return null;
    }
    const { expiresAt: _expiresAt, ...result } = memory;
    return structuredClone(result);
  }

  async setWorkingMemory(memory: WorkingMemory): Promise<void> {
    this.#working.set(workingKey(memory.scope), {
      ...structuredClone(memory),
      expiresAt: Date.now() + memory.ttlSeconds * 1_000,
    });
  }

  async deleteWorkingMemory(scope: MemoryScope): Promise<void> {
    this.#working.delete(workingKey(scope));
  }

  async createHandoff(handoff: AgentHandoff, scope: MemoryScope): Promise<MemoryRecord> {
    const now = handoff.timestamp;
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
        source: agentSource(handoff.fromAgent),
        trustLevel: "verified",
        ...(handoff.commit ? { sourceCommit: handoff.commit } : {}),
        createdAt: now,
        updatedAt: now,
        fingerprint: createHash("sha256").update(JSON.stringify(handoff)).digest("hex"),
      },
    };
    return this.remember(record);
  }

  async health(): Promise<HealthStatus> {
    return { status: "healthy", provider: this.name, redis: "unknown", latencyMs: 0 };
  }

  async count(scope: MemoryScope): Promise<number> {
    return [...this.#memories.values()].filter(
      (memory) => sameProject(memory, scope) && (scope.namespace === "*" || memory.namespace === scope.namespace),
    ).length;
  }
}

function sameProject(memory: MemoryRecord, scope: MemoryScope): boolean {
  return memory.workspaceId === scope.workspaceId && memory.projectId === scope.projectId;
}

function workingKey(scope: MemoryScope): string {
  return [scope.workspaceId, scope.projectId ?? "global", scope.namespace, scope.agentId, scope.sessionId ?? "default"].join(":" );
}

function tokenize(text: string): Set<string> {
  return new Set(text.toLocaleLowerCase("en-US").match(/[\p{L}\p{N}/._-]+/gu) ?? []);
}

function score(memory: MemoryRecord, queryTerms: Set<string>): number {
  if (queryTerms.size === 0) return 1;
  const memoryTerms = tokenize(`${memory.title} ${memory.content}`);
  let matches = 0;
  for (const term of queryTerms) if (memoryTerms.has(term)) matches += 1;
  return matches / queryTerms.size;
}

function agentSource(agent: string): "codex" | "grok" | "composer" | "orca" | "external" {
  return agent === "codex" || agent === "grok" || agent === "composer" || agent === "orca" ? agent : "external";
}
