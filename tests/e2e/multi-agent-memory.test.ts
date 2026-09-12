import { describe, expect, it } from "vitest";

import { MemoryService } from "../../src/application/memory-service.js";
import { InMemoryAgentMemoryAdapter } from "../../src/infrastructure/in-memory-agent-memory-adapter.js";
import { MemoryToolController } from "../../src/mcp/memory-tool-controller.js";

const baseScope = {
  workspaceId: "orca",
  projectId: "shared-memory-demo",
  namespace: "decisions",
  sessionId: "run-1",
};

describe("multi-agent shared knowledge", () => {
  it("shares a Grok decision with Codex and a Codex contract with Composer without project leakage", async () => {
    const provider = new InMemoryAgentMemoryAdapter();
    const grants = [{ workspaceId: "orca", projectIds: ["shared-memory-demo", "another-project"] }];
    const grok = new MemoryToolController(new MemoryService(provider), "grok", grants);
    const codex = new MemoryToolController(new MemoryService(provider), "codex", grants);
    const composer = new MemoryToolController(new MemoryService(provider), "composer", grants);

    await grok.call("memory_store_decision", {
      scope: { ...baseScope, agentId: "grok" },
      title: "Leads backend API",
      decision: "The backend API will expose /api/leads using REST.",
      reason: "Stable shared contract.",
      trustLevel: "verified",
    });

    const decisions = await codex.call("memory_search_decisions", {
      scope: { ...baseScope, agentId: "codex" },
      query: "backend API decisions REST leads",
      limit: 5,
    });
    expect(JSON.stringify(decisions)).toContain("/api/leads");

    await codex.call("memory_remember", {
      scope: { ...baseScope, namespace: "api-contracts", agentId: "codex" },
      type: "api-contract",
      title: "List leads",
      content: "GET /api/leads responds with Lead[].",
      source: "codex",
      trustLevel: "verified",
    });

    const contract = await composer.call("memory_search", {
      scope: { ...baseScope, namespace: "api-contracts", agentId: "composer" },
      query: "GET leads response Lead",
      limit: 5,
    });
    expect(JSON.stringify(contract)).toContain("Lead[]");

    const leaked = await composer.call("memory_search", {
      scope: {
        ...baseScope,
        projectId: "another-project",
        namespace: "api-contracts",
        agentId: "composer",
      },
      query: "GET leads response Lead",
      limit: 5,
    });
    expect(leaked).toEqual([]);
  });
});
