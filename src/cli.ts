#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { MemoryService } from "./application/memory-service.js";
import { loadConfig } from "./config.js";
import { evaluateMemoryDiagnostics, selectSemanticProbeScope } from "./diagnostics/doctor.js";
import type { AgentMemoryProvider } from "./domain/agent-memory-provider.js";
import { InMemoryAgentMemoryAdapter } from "./infrastructure/in-memory-agent-memory-adapter.js";
import { RedisAgentMemoryAdapter } from "./infrastructure/redis-agent-memory-adapter.js";
import { startMcpServer } from "./mcp/server.js";

async function main(): Promise<void> {
  const command = process.argv[2] ?? "help";
  const config = loadConfig();

  if (command === "serve") {
    const service = createService(config);
    await startMcpServer(service, config);
    process.stderr.write(`Shared Memory MCP listening on http://${config.host}:${config.port}/mcp\n`);
    return;
  }
  if (command === "health" || command === "status") {
    const service = createService(config);
    const health = await service.health();
    process.stdout.write(`${JSON.stringify(health, null, 2)}\n`);
    process.exitCode = health.status === "healthy" ? 0 : 1;
    return;
  }
  if (command === "doctor") {
    await doctor(config);
    return;
  }
  if (command === "search" || command === "inspect") {
    const [workspaceId, projectId, namespace, ...queryParts] = process.argv.slice(3);
    if (!workspaceId || !projectId || !namespace || queryParts.length === 0) {
      throw new Error("Usage: memory search <workspace> <project> <namespace|*> <query>");
    }
    const result = await callMcp(config, "memory_search", {
      scope: { workspaceId, projectId, namespace, agentId: "orca" },
      query: queryParts.join(" "),
      minRelevance: 0,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (command === "clear-session") {
    const [workspaceId, projectId, namespace, sessionId] = process.argv.slice(3);
    if (!workspaceId || !projectId || !namespace || !sessionId) {
      throw new Error("Usage: memory clear-session <workspace> <project> <namespace> <session>");
    }
    await callMcp(config, "memory_clear_working", {
      scope: { workspaceId, projectId, namespace, sessionId, agentId: "orca" },
    });
    process.stdout.write("Working memory session cleared.\n");
    return;
  }
  process.stdout.write(
    "Usage: memory <serve|health|status|doctor|search|inspect|clear-session>\nInfrastructure: docker compose -f docker-compose.memory.yml <up -d|down|ps>\n",
  );
}

function createService(config: ReturnType<typeof loadConfig>): MemoryService {
  return new MemoryService(createProvider(config), {
    workingTtlSeconds: config.workingTtlSeconds,
    maxResults: config.maxResults,
    minRelevance: config.minRelevance,
    maxContextTokens: config.maxContextTokens,
    maxContentBytes: config.maxContentBytes,
  });
}

function createProvider(config: ReturnType<typeof loadConfig>): AgentMemoryProvider {
  if (config.provider === "in-memory") return new InMemoryAgentMemoryAdapter();
  return new RedisAgentMemoryAdapter({
    baseUrl: config.agentMemoryUrl,
    ...(config.agentMemoryApiKey ? { apiKey: config.agentMemoryApiKey } : {}),
    ...(config.redisUrl ? { redisUrl: config.redisUrl } : {}),
    maxContentBytes: config.maxContentBytes,
    timeoutMs: config.requestTimeoutMs,
    maxRetries: config.maxRetries,
  });
}

async function callMcp(config: ReturnType<typeof loadConfig>, name: string, args: Record<string, unknown>) {
  const key = process.env.SHARED_MEMORY_ORCA_KEY ?? config.agentKeys.orca;
  if (!key) throw new Error("SHARED_MEMORY_ORCA_KEY is required for operator commands");
  const endpoint = new URL(process.env.AGENT_MEMORY_MCP_URL ?? `http://127.0.0.1:${config.port}/mcp`);
  const client = new Client({ name: "shared-memory-cli", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(endpoint, {
    requestInit: { headers: { authorization: `Bearer ${key}`, "x-agent-id": "orca" } },
  });
  try {
    await client.connect(transport);
    return await client.callTool({ name, arguments: args });
  } finally {
    await client.close();
  }
}

async function doctor(config: ReturnType<typeof loadConfig>): Promise<void> {
  const home = homedir();
  const checks: Array<[string, boolean]> = [];
  let healthResult: unknown;
  let semanticResult: unknown;
  try {
    healthResult = await callMcp(config, "memory_health", {});
    const probeScope = selectSemanticProbeScope(config.agentGrants.orca ?? []);
    if (probeScope) {
      semanticResult = await callMcp(config, "memory_search", {
        scope: probeScope,
        query: "shared memory semantic health probe",
        limit: 1,
        minRelevance: 0,
        searchMode: "semantic",
      });
    }
  } catch {
    // The pure evaluator reports unavailable checks without exposing credentials or payloads.
  }
  checks.push(...evaluateMemoryDiagnostics(healthResult, semanticResult));
  checks.push(["Codex", fileContains(join(home, ".codex/config.toml"), "shared_memory")]);
  checks.push(["Composer", fileContains(join(home, ".cursor/mcp.json"), "shared_memory")]);
  checks.push(["Grok", executableExists("grok")]);
  checks.push(["Orca skill", existsSync(join(home, ".agents/skills/shared-memory/SKILL.md"))]);
  checks.push(["Scope grants", Boolean(config.agentGrants.orca?.length)]);
  process.stdout.write("Shared Memory\n\n");
  for (const [name, healthy] of checks) {
    process.stdout.write(`${name.padEnd(22)} ${healthy ? "✓" : "✗"}\n`);
  }
  const ready = checks.every(([, healthy]) => healthy);
  process.stdout.write(`\nStatus: ${ready ? "Ready" : "Not ready"}\n`);
  process.exitCode = ready ? 0 : 1;
}

function fileContains(path: string, value: string): boolean {
  try {
    return readFileSync(path, "utf8").includes(value);
  } catch {
    return false;
  }
}

function executableExists(name: string): boolean {
  try {
    execFileSync("sh", ["-c", `command -v ${name}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Shared memory failed"}\n`);
  process.exitCode = 1;
});
