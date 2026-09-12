import type { AddressInfo } from "node:net";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, describe, expect, it } from "vitest";

import { MemoryService } from "../../src/application/memory-service.js";
import type { AppConfig } from "../../src/config.js";
import { InMemoryAgentMemoryAdapter } from "../../src/infrastructure/in-memory-agent-memory-adapter.js";
import { startMcpServer } from "../../src/mcp/server.js";

const openServers: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()));
});

describe("Shared Memory Streamable HTTP MCP", () => {
  it("lists the high-level tools and calls health through the MCP protocol", async () => {
    const started = await startMcpServer(new MemoryService(new InMemoryAgentMemoryAdapter()), testConfig());
    openServers.push(started);
    const port = (started.server.address() as AddressInfo).port;
    const client = new Client({ name: "integration-test", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
      requestInit: { headers: { "x-agent-id": "codex" } },
    });

    await client.connect(transport);
    const tools = await client.listTools();
    const health = await client.callTool({ name: "memory_health", arguments: {} });
    await client.close();

    expect(tools.tools.map((tool) => tool.name)).toContain("memory_get_project_context");
    const searchTool = tools.tools.find((tool) => tool.name === "memory_search");
    expect(searchTool?.inputSchema).toMatchObject({
      type: "object",
      required: expect.arrayContaining(["scope", "query"]),
    });
    expect(JSON.stringify(health)).toContain("healthy");
  });

  it("rejects unauthenticated MCP requests", async () => {
    const started = await startMcpServer(new MemoryService(new InMemoryAgentMemoryAdapter()), testConfig());
    openServers.push(started);
    const port = (started.server.address() as AddressInfo).port;

    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    });

    expect(response.status).toBe(401);
  });

  it("authenticates an agent but denies an ungranted project scope", async () => {
    const config = testConfig();
    config.disableAuth = false;
    config.agentKeys = { codex: "codex-integration-key-123456" };
    const started = await startMcpServer(new MemoryService(new InMemoryAgentMemoryAdapter()), config);
    openServers.push(started);
    const port = (started.server.address() as AddressInfo).port;
    const client = new Client({ name: "authorization-test", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
      requestInit: { headers: { authorization: "Bearer codex-integration-key-123456" } },
    });
    await client.connect(transport);
    const result = await client.callTool({
      name: "memory_search",
      arguments: {
        scope: {
          workspaceId: "workspace",
          projectId: "project-b",
          namespace: "security",
          agentId: "codex",
        },
        query: "restricted",
      },
    });
    await client.close();
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain("access denied");
  });
});

function testConfig(): AppConfig {
  return {
    provider: "in-memory",
    agentMemoryUrl: "http://127.0.0.1:8000",
    host: "127.0.0.1",
    port: 0,
    disableAuth: true,
    agentKeys: {},
    agentGrants: {
      codex: [{ workspaceId: "workspace", projectIds: ["project-a"] }],
    },
    workingTtlSeconds: 3_600,
    maxResults: 7,
    minRelevance: 0.25,
    maxContextTokens: 2_000,
    maxContentBytes: 16_384,
    requestTimeoutMs: 1_000,
    maxRetries: 0,
    rateLimitPerMinute: 120,
  };
}
