import { z } from "zod";

import type { MemoryService } from "../application/memory-service.js";
import type { AgentScopeGrant } from "../config.js";
import { MEMORY_TYPES, type MemoryScope, type MemorySource, type TrustLevel } from "../domain/memory.js";

const identifier = z.string().min(1).max(128).regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
const namespace = z.string().min(1).max(128).regex(/^(?:\*|[a-zA-Z0-9][a-zA-Z0-9._/-]*)$/);
export const scopeSchema = z.object({
  workspaceId: identifier,
  projectId: identifier.optional(),
  namespace,
  sessionId: identifier.optional(),
  agentId: identifier,
  runId: identifier.optional(),
  taskId: identifier.optional(),
  featureId: identifier.optional(),
});

const trustLevelSchema = z.enum(["trusted", "verified", "unverified", "external"]);
const sourceSchema = z.enum(["user", "repository", "codex", "grok", "composer", "orca", "external"]);
const memoryTypeSchema = z.enum(MEMORY_TYPES);
const contextSchema = z
  .object({
    scope: scopeSchema,
    query: z.string().min(1).max(16_384),
    feature: z.string().max(256).optional(),
    limit: z.number().int().positive().max(100).optional(),
    currentCommit: z.string().max(128).optional(),
  })
  .strict();

export const memoryToolSchemas = {
  memory_search: z
    .object({
      scope: scopeSchema,
      query: z.string().min(1).max(16_384),
      types: z.array(memoryTypeSchema).max(10).optional(),
      limit: z.number().int().positive().max(100).optional(),
      minRelevance: z.number().min(0).max(1).optional(),
      searchMode: z.enum(["semantic", "keyword", "hybrid"]).optional(),
      currentCommit: z.string().max(128).optional(),
    })
    .strict(),
  memory_remember: z
    .object({
      scope: scopeSchema,
      type: memoryTypeSchema,
      title: z.string().min(1).max(256),
      content: z.string().min(1).max(16_384),
      source: sourceSchema,
      trustLevel: trustLevelSchema,
      files: z.array(z.string().max(1_024)).max(100).optional(),
      confidence: z.number().min(0).max(1).optional(),
      repository: z.string().max(1_024).optional(),
      branch: z.string().max(256).optional(),
      sourceCommit: z.string().max(128).optional(),
    })
    .strict(),
  memory_update: z
    .object({
      id: z.string().min(1).max(256),
      scope: scopeSchema,
      type: memoryTypeSchema,
      title: z.string().min(1).max(256),
      content: z.string().min(1).max(16_384),
      source: sourceSchema,
      trustLevel: trustLevelSchema,
    })
    .strict(),
  memory_forget: z.object({ scope: scopeSchema, ids: z.array(z.string().min(1)).min(1).max(100) }).strict(),
  memory_context: contextSchema,
  memory_get_project_context: contextSchema,
  memory_create_handoff: z
    .object({
      scope: scopeSchema,
      toAgent: identifier.optional(),
      objective: z.string().min(1).max(2_000),
      completed: z.array(z.string().max(2_000)).max(100),
      remaining: z.array(z.string().max(2_000)).max(100),
      affectedFiles: z.array(z.string().max(1_024)).max(200),
      testsExecuted: z.array(z.string().max(2_000)).max(100),
      decisions: z.array(z.string().max(2_000)).max(100),
      knownRisks: z.array(z.string().max(2_000)).max(100),
      blockers: z.array(z.string().max(2_000)).max(100),
      recommendedNextAction: z.string().max(2_000).optional(),
      commit: z.string().max(128).optional(),
    })
    .strict(),
  memory_get_latest_handoff: z
    .object({ scope: scopeSchema, query: z.string().max(2_000).default("handoff") })
    .strict(),
  memory_store_decision: z
    .object({
      scope: scopeSchema,
      title: z.string().min(1).max(256),
      decision: z.string().min(1).max(12_000),
      reason: z.string().min(1).max(4_000),
      trustLevel: trustLevelSchema.default("verified"),
      files: z.array(z.string().max(1_024)).max(100).optional(),
      sourceCommit: z.string().max(128).optional(),
    })
    .strict(),
  memory_search_decisions: z
    .object({
      scope: scopeSchema,
      query: z.string().min(1).max(16_384),
      limit: z.number().int().positive().max(100).optional(),
    })
    .strict(),
  memory_get_working: z.object({ scope: scopeSchema }).strict(),
  memory_set_working: z.object({ scope: scopeSchema, data: z.record(z.string(), z.unknown()) }).strict(),
  memory_clear_working: z.object({ scope: scopeSchema }).strict(),
  memory_health: z.object({}).strict(),
} as const;

export const MEMORY_TOOL_NAMES = [
  "memory_search",
  "memory_remember",
  "memory_update",
  "memory_forget",
  "memory_context",
  "memory_get_project_context",
  "memory_create_handoff",
  "memory_get_latest_handoff",
  "memory_store_decision",
  "memory_search_decisions",
  "memory_get_working",
  "memory_set_working",
  "memory_clear_working",
  "memory_health",
] as const;

export type MemoryToolName = (typeof MEMORY_TOOL_NAMES)[number];

export class MemoryToolController {
  constructor(
    private readonly service: MemoryService,
    private readonly authenticatedAgentId: string,
    private readonly grants: readonly AgentScopeGrant[],
  ) {}

  async call(name: string, rawInput: unknown): Promise<unknown> {
    switch (name as MemoryToolName) {
      case "memory_search":
        return this.#search(rawInput);
      case "memory_remember":
        return this.#remember(rawInput);
      case "memory_update":
        return this.#update(rawInput);
      case "memory_forget":
        return this.#forget(rawInput);
      case "memory_context":
      case "memory_get_project_context":
        return this.#context(rawInput);
      case "memory_create_handoff":
        return this.#createHandoff(rawInput);
      case "memory_get_latest_handoff":
        return this.#latestHandoff(rawInput);
      case "memory_store_decision":
        return this.#storeDecision(rawInput);
      case "memory_search_decisions":
        return this.#searchDecisions(rawInput);
      case "memory_get_working":
        return this.#getWorking(rawInput);
      case "memory_set_working":
        return this.#setWorking(rawInput);
      case "memory_clear_working":
        return this.#clearWorking(rawInput);
      case "memory_health":
        memoryToolSchemas.memory_health.parse(rawInput);
        return this.service.health();
      default:
        throw new Error(`Unknown memory tool: ${name}`);
    }
  }

  async #search(rawInput: unknown) {
    const input = memoryToolSchemas.memory_search.parse(rawInput);
    return this.service.search({ ...input, scope: this.#scope(input.scope) });
  }

  async #remember(rawInput: unknown) {
    const input = memoryToolSchemas.memory_remember.parse(rawInput);
    return this.service.remember({
      scope: this.#scope(input.scope),
      type: input.type,
      title: input.title,
      content: input.content,
      metadata: metadataFrom(input, this.authenticatedAgentId),
    });
  }

  async #update(rawInput: unknown) {
    const input = memoryToolSchemas.memory_update.parse(rawInput);
    return this.service.supersede(input.id, {
      scope: this.#scope(input.scope),
      type: input.type,
      title: input.title,
      content: input.content,
      metadata: metadataFrom(input, this.authenticatedAgentId),
    });
  }

  async #forget(rawInput: unknown) {
    const input = memoryToolSchemas.memory_forget.parse(rawInput);
    await this.service.forget(input.ids, this.#scope(input.scope));
    return { deleted: input.ids.length };
  }

  async #context(rawInput: unknown) {
    const input = memoryToolSchemas.memory_context.parse(rawInput);
    const query = [input.query, input.feature].filter(Boolean).join(" ");
    return this.service.search({
      scope: this.#scope({ ...input.scope, namespace: "*" }),
      query,
      types: ["architecture", "decision", "constraint", "security", "api-contract", "handoff"],
      ...(input.limit ? { limit: input.limit } : {}),
      ...(input.currentCommit ? { currentCommit: input.currentCommit } : {}),
    });
  }

  async #storeDecision(rawInput: unknown) {
    const input = memoryToolSchemas.memory_store_decision.parse(rawInput);
    return this.service.remember({
      scope: this.#scope({ ...input.scope, namespace: "decisions" }),
      type: "decision",
      title: input.title,
      content: `${input.decision}\n\nReason: ${input.reason}`,
      metadata: {
        agent: this.authenticatedAgentId,
        source: sourceForAuthenticatedAgent(this.authenticatedAgentId),
        trustLevel: input.trustLevel,
        ...(input.files ? { files: input.files } : {}),
        ...(input.sourceCommit ? { sourceCommit: input.sourceCommit } : {}),
      },
    });
  }

  async #searchDecisions(rawInput: unknown) {
    const input = memoryToolSchemas.memory_search_decisions.parse(rawInput);
    return this.service.search({
      scope: this.#scope({ ...input.scope, namespace: "decisions" }),
      query: input.query,
      types: ["decision"],
      ...(input.limit ? { limit: input.limit } : {}),
    });
  }

  async #createHandoff(rawInput: unknown) {
    const input = memoryToolSchemas.memory_create_handoff.parse(rawInput);
    if (!input.scope.projectId) throw new Error("Handoff requires projectId");
    return this.service.createHandoff(this.#scope({ ...input.scope, namespace: "handoffs" }), {
      fromAgent: this.authenticatedAgentId,
      ...(input.toAgent ? { toAgent: input.toAgent } : {}),
      projectId: input.scope.projectId,
      ...(input.scope.runId ? { runId: input.scope.runId } : {}),
      ...(input.scope.taskId ? { taskId: input.scope.taskId } : {}),
      objective: input.objective,
      completed: input.completed,
      remaining: input.remaining,
      affectedFiles: input.affectedFiles,
      testsExecuted: input.testsExecuted,
      decisions: input.decisions,
      knownRisks: input.knownRisks,
      blockers: input.blockers,
      ...(input.recommendedNextAction ? { recommendedNextAction: input.recommendedNextAction } : {}),
      ...(input.commit ? { commit: input.commit } : {}),
    });
  }

  async #latestHandoff(rawInput: unknown) {
    const input = memoryToolSchemas.memory_get_latest_handoff.parse(rawInput);
    const results = await this.service.search({
      scope: this.#scope({ ...input.scope, namespace: "handoffs" }),
      query: input.query,
      types: ["handoff"],
      minRelevance: 0,
    });
    return results.sort((a, b) => b.metadata.updatedAt.localeCompare(a.metadata.updatedAt))[0] ?? null;
  }

  async #getWorking(rawInput: unknown) {
    const input = memoryToolSchemas.memory_get_working.parse(rawInput);
    return this.service.getWorkingMemory(this.#scope(input.scope));
  }

  async #setWorking(rawInput: unknown) {
    const input = memoryToolSchemas.memory_set_working.parse(rawInput);
    await this.service.setWorkingMemory(this.#scope(input.scope), input.data);
    return { stored: true };
  }

  async #clearWorking(rawInput: unknown) {
    const input = memoryToolSchemas.memory_clear_working.parse(rawInput);
    await this.service.clearWorkingMemory(this.#scope(input.scope));
    return { deleted: true };
  }

  #scope(scope: MemoryScope): MemoryScope {
    if (scope.agentId !== this.authenticatedAgentId) {
      throw new Error("Agent impersonation rejected");
    }
    if (!isScopeGranted(scope, this.grants)) {
      throw new Error("Workspace or project access denied");
    }
    return scope;
  }
}

export function isScopeGranted(scope: MemoryScope, grants: readonly AgentScopeGrant[]): boolean {
  return grants.some(
    (grant) =>
      (grant.workspaceId === "*" || grant.workspaceId === scope.workspaceId) &&
      (scope.projectId === undefined
        ? grant.allowGlobal === true
        : grant.projectIds.includes("*") || grant.projectIds.includes(scope.projectId)),
  );
}

function metadataFrom(
  input: {
    source: MemorySource;
    trustLevel: TrustLevel;
    files?: string[];
    confidence?: number;
    repository?: string;
    branch?: string;
    sourceCommit?: string;
  },
  agent: string,
) {
  const agentSources = new Set(["codex", "grok", "composer", "orca"]);
  if (agentSources.has(input.source) && input.source !== agent) {
    throw new Error("Agent provenance impersonation rejected");
  }
  if (input.source === "user" || input.trustLevel === "trusted") {
    throw new Error("MCP agents cannot self-assert user/trusted provenance");
  }
  if (input.source === "external" && input.trustLevel !== "external" && input.trustLevel !== "unverified") {
    throw new Error("External provenance cannot be verified by an agent");
  }
  return {
    agent,
    source: input.source,
    trustLevel: input.trustLevel,
    ...(input.files ? { files: input.files } : {}),
    ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
    ...(input.repository ? { repository: input.repository } : {}),
    ...(input.branch ? { branch: input.branch } : {}),
    ...(input.sourceCommit ? { sourceCommit: input.sourceCommit } : {}),
  };
}

function sourceForAuthenticatedAgent(agent: string): "codex" | "grok" | "composer" | "orca" | "external" {
  return agent === "codex" || agent === "grok" || agent === "composer" || agent === "orca" ? agent : "external";
}
