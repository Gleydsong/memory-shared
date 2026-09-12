import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/config.js";

describe("shared memory configuration", () => {
  it("rejects unauthenticated non-loopback listeners", () => {
    expect(() =>
      loadConfig({ MEMORY_DISABLE_AUTH: "true", MEMORY_MCP_HOST: "0.0.0.0" }),
    ).toThrow(/loopback/i);
  });

  it("requires per-agent keys when auth is enabled", () => {
    expect(() => loadConfig({ MEMORY_DISABLE_AUTH: "false" })).toThrow(/MEMORY_AGENT_KEYS_JSON/);
  });

  it("requires an explicit scope grant for every authenticated agent", () => {
    expect(() =>
      loadConfig({
        MEMORY_AGENT_KEYS_JSON: JSON.stringify({ codex: "a".repeat(24) }),
      }),
    ).toThrow(/MEMORY_AGENT_GRANTS_JSON/);
  });

  it("rejects documented example placeholder keys", () => {
    expect(() =>
      loadConfig({
        MEMORY_DISABLE_AUTH: "false",
        MEMORY_AGENT_KEYS_JSON: JSON.stringify({
          codex: "replace-with-random-key-at-least-24-chars",
        }),
        MEMORY_AGENT_GRANTS_JSON: JSON.stringify({
          codex: [{ workspaceId: "local", projectIds: ["demo"] }],
        }),
      }),
    ).toThrow(/placeholder/i);
  });

  it("loads bounded token, relevance and TTL settings", () => {
    const config = loadConfig({
      MEMORY_DISABLE_AUTH: "true",
      MEMORY_MCP_HOST: "127.0.0.1",
      MEMORY_MAX_RESULTS: "5",
      MEMORY_MAX_CONTEXT_TOKENS: "1200",
      MEMORY_MIN_RELEVANCE: "0.4",
      MEMORY_WORKING_TTL_SECONDS: "43200",
    });

    expect(config).toMatchObject({
      maxResults: 5,
      maxContextTokens: 1200,
      minRelevance: 0.4,
      workingTtlSeconds: 43200,
    });
  });
});
