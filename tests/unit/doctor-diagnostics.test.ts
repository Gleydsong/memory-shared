import { describe, expect, it } from "vitest";

import {
  evaluateMemoryDiagnostics,
  selectSemanticProbeScope,
} from "../../src/diagnostics/doctor.js";

const healthyResult = {
  content: [
    {
      type: "text",
      text: JSON.stringify({ status: "healthy", redis: "healthy" }),
    },
  ],
};

describe("memory doctor diagnostics", () => {
  it("reports semantic search as failed even when infrastructure health is green", () => {
    expect(
      evaluateMemoryDiagnostics(healthyResult, {
        isError: true,
        content: [{ type: "text", text: "Memory provider returned HTTP 500" }],
      }),
    ).toEqual([
      ["Redis / Agent Memory", true],
      ["MCP protocol", true],
      ["Semantic search", false],
    ]);
  });

  it("selects a bounded project scope from the Orca grant", () => {
    expect(
      selectSemanticProbeScope([
        { workspaceId: "acme", projectIds: ["demo-app", "docs-site"] },
      ]),
    ).toEqual({
      workspaceId: "acme",
      projectId: "demo-app",
      namespace: "decisions",
      agentId: "orca",
    });
  });

  it("uses a reserved healthcheck project when the grant allows all projects", () => {
    expect(selectSemanticProbeScope([{ workspaceId: "acme", projectIds: ["*"] }])).toMatchObject({
      workspaceId: "acme",
      projectId: "shared-memory-healthcheck",
    });
  });
});
