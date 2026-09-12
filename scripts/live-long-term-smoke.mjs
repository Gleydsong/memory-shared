#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const key = process.env.SHARED_MEMORY_CODEX_KEY;
if (!key) throw new Error("SHARED_MEMORY_CODEX_KEY is required");

const endpoint = new URL(process.env.AGENT_MEMORY_MCP_URL ?? "http://127.0.0.1:8787/mcp");
const client = new Client({ name: "shared-memory-long-term-smoke", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(endpoint, {
  requestInit: { headers: { Authorization: `Bearer ${key}` } },
});
const configuredWorkspace = (() => {
  if (!process.env.MEMORY_AGENT_GRANTS_JSON) return undefined;
  const grants = JSON.parse(process.env.MEMORY_AGENT_GRANTS_JSON);
  return grants.codex?.[0]?.workspaceId;
})();
const scope = {
  workspaceId: process.env.MEMORY_SMOKE_WORKSPACE_ID ?? configuredWorkspace ?? "local",
  projectId: "shared-memory-healthcheck",
  namespace: "decisions",
  sessionId: `smoke-${Date.now()}`,
  agentId: "codex",
};

function resultValue(result) {
  if (result.isError) throw new Error(result.content?.[0]?.text ?? "MCP tool failed");
  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("MCP tool returned no JSON text result");
  return JSON.parse(text);
}

let storedId;
try {
  await client.connect(transport);
  const stored = resultValue(
    await client.callTool({
      name: "memory_store_decision",
      arguments: {
        scope,
        title: "Temporary Ollama semantic smoke",
        decision: "Local semantic memory uses the temporary verification marker orca-ollama-768.",
        reason: "Prove MCP to Agent Memory to Ollama embeddings to Redis search.",
        trustLevel: "verified",
      },
    }),
  );
  storedId = stored.id;
  if (!storedId) throw new Error("Stored memory did not return an id");

  let found = [];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    found = resultValue(
      await client.callTool({
        name: "memory_search_decisions",
        arguments: { scope, query: "orca-ollama-768 local semantic verification marker", limit: 3 },
      }),
    );
    if (JSON.stringify(found).includes("orca-ollama-768")) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!JSON.stringify(found).includes("orca-ollama-768")) {
    throw new Error("Semantic search did not retrieve the temporary decision");
  }
  process.stdout.write("Live MCP -> Agent Memory -> Ollama embeddings -> Redis search passed.\n");
} finally {
  if (storedId) {
    await client.callTool({ name: "memory_forget", arguments: { scope, ids: [storedId] } });
  }
  await client.close();
}
