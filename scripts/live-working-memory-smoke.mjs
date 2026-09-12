#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const key = process.env.SHARED_MEMORY_CODEX_KEY;
if (!key) throw new Error("SHARED_MEMORY_CODEX_KEY is required");
const url = new URL(process.env.AGENT_MEMORY_MCP_URL ?? "http://127.0.0.1:8787/mcp");
const client = new Client({ name: "shared-memory-live-smoke", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(url, {
  requestInit: { headers: { Authorization: `Bearer ${key}` } },
});

const scope = {
  workspaceId: process.env.MEMORY_SMOKE_WORKSPACE_ID ?? "local",
  projectId: "working-memory-smoke",
  namespace: "tasks",
  sessionId: `smoke-${Date.now()}`,
  agentId: "codex",
};

try {
  await client.connect(transport);
  const health = await client.callTool({ name: "memory_health", arguments: {} });
  const stored = await client.callTool({
    name: "memory_set_working",
    arguments: { scope, data: { objective: "Verify MCP to V0 to Redis", status: "temporary" } },
  });
  const retrieved = await client.callTool({ name: "memory_get_working", arguments: { scope } });
  const combined = JSON.stringify({ health, stored, retrieved });
  if (!combined.includes("healthy") || !combined.includes("Verify MCP to V0 to Redis")) {
    throw new Error("Live working-memory smoke did not retrieve the stored objective");
  }
  await client.callTool({ name: "memory_clear_working", arguments: { scope } });
  process.stdout.write("Live MCP -> Agent Memory V0 -> Redis working-memory smoke passed.\n");
} finally {
  await client.close();
}
