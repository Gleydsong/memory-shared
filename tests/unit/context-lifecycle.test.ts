import { describe, expect, it } from "vitest";

import { MemoryService } from "../../src/application/memory-service.js";
import { InMemoryAgentMemoryAdapter } from "../../src/infrastructure/in-memory-agent-memory-adapter.js";

const scope = {
  workspaceId: "workspace",
  projectId: "project-a",
  namespace: "architecture",
  sessionId: "session-1",
  agentId: "codex",
};

describe("memory context and lifecycle", () => {
  it("ranks relevant memories and marks commit-divergent records possibly stale", async () => {
    const service = new MemoryService(new InMemoryAgentMemoryAdapter(), { minRelevance: 0 });
    await service.remember({
      scope,
      type: "architecture",
      title: "Authentication architecture",
      content: "Authentication uses signed HTTP-only refresh cookies.",
      metadata: { source: "repository", trustLevel: "verified", sourceCommit: "old-commit" },
    });
    await service.remember({
      scope,
      type: "architecture",
      title: "Billing architecture",
      content: "Billing activation follows authenticated webhooks.",
      metadata: { source: "repository", trustLevel: "verified", sourceCommit: "current-commit" },
    });

    const results = await service.search({
      scope,
      query: "authentication refresh cookies",
      currentCommit: "current-commit",
      minRelevance: 0,
    });

    expect(results[0]?.title).toBe("Authentication architecture");
    expect(results[0]?.possiblyStale).toBe(true);
    expect(results[1]?.possiblyStale).toBeUndefined();
  });

  it("creates a structured handoff and clears TTL working memory", async () => {
    const provider = new InMemoryAgentMemoryAdapter();
    const service = new MemoryService(provider);
    await service.setWorkingMemory(scope, { objective: "temporary" });
    const handoff = await service.createHandoff({ ...scope, namespace: "handoffs" }, {
      fromAgent: "codex",
      toAgent: "composer",
      projectId: "project-a",
      objective: "Continue the UI",
      completed: ["Backend contract"],
      remaining: ["UI"],
      affectedFiles: ["src/api.ts"],
      testsExecuted: ["npm test"],
      decisions: ["REST"],
      knownRisks: [],
      blockers: [],
      recommendedNextAction: "Read the API contract",
      commit: "abc123",
    });
    await service.clearWorkingMemory(scope);

    expect(handoff.type).toBe("handoff");
    expect(handoff.content).toContain("Continue the UI");
    expect(await service.getWorkingMemory(scope)).toBeNull();
  });
});
