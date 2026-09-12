import { createHash, timingSafeEqual } from "node:crypto";
import type { Server } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { rateLimit } from "express-rate-limit";
import type { ZodType } from "zod";
import type { MemoryService } from "../application/memory-service.js";
import { isLoopbackHost, type AgentScopeGrant, type AppConfig } from "../config.js";
import { MemoryTelemetry } from "../observability/telemetry.js";
import { MEMORY_TOOL_NAMES, memoryToolSchemas, MemoryToolController } from "./memory-tool-controller.js";

type StartedMcpServer = { server: Server; close: () => Promise<void> };

const TOOL_DESCRIPTIONS: Record<(typeof MEMORY_TOOL_NAMES)[number], string> = {
  memory_search: "Search active project memories with project-safe filters and a bounded context budget.",
  memory_remember: "Store one durable, atomic fact after policy, secret and injection checks.",
  memory_update: "Supersede an existing memory with a new current record.",
  memory_forget: "Delete selected memories inside the authenticated workspace and project scope.",
  memory_context: "Build bounded architecture, decision, constraint, security, contract and handoff context.",
  memory_get_project_context: "Get bounded project context and stale-memory indicators.",
  memory_create_handoff: "Store a structured handoff from the authenticated agent.",
  memory_get_latest_handoff: "Retrieve the latest relevant project handoff.",
  memory_store_decision: "Store one project decision with its reason and repository provenance.",
  memory_search_decisions: "Search active decisions in one project.",
  memory_get_working: "Read TTL-bound working memory for one session.",
  memory_set_working: "Replace TTL-bound working memory for one session.",
  memory_clear_working: "Delete TTL-bound working memory for one session.",
  memory_health: "Report memory provider and Redis health without exposing secrets.",
};

const READ_ONLY_TOOLS = new Set([
  "memory_search",
  "memory_context",
  "memory_get_project_context",
  "memory_get_latest_handoff",
  "memory_search_decisions",
  "memory_get_working",
  "memory_health",
]);

export async function startMcpServer(
  service: MemoryService,
  config: AppConfig,
  telemetry = new MemoryTelemetry(),
): Promise<StartedMcpServer> {
  const app = createMcpExpressApp({
    host: config.host,
    ...(!isLoopbackHost(config.host)
      ? { allowedHosts: ["127.0.0.1", "localhost", "[::1]", "shared-memory-mcp"] }
      : {}),
  });
  app.use(
    "/mcp",
    rateLimit({
      windowMs: 60_000,
      limit: config.rateLimitPerMinute,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );

  app.get("/health", async (_request, response) => {
    const provider = await service.health();
    response.status(provider.status === "healthy" ? 200 : 503).json({
      status: provider.status,
      redis: provider.redis,
      agentMemory: provider.status,
      mcp: "healthy",
      latencyMs: provider.latencyMs,
    });
  });

  app.get("/metrics", (_request, response) => {
    response.type("text/plain").send(`${telemetry.prometheus()}\n`);
  });

  app.post("/mcp", async (request, response) => {
    const agentId = authenticate(request.headers, request.socket.remoteAddress, config);
    if (!agentId) {
      response.status(401).json({ error: "unauthorized" });
      return;
    }
    const mcp = createAgentServer(service, agentId, telemetry, config.agentGrants[agentId] ?? []);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    try {
      await mcp.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      telemetry.event("memory.mcp_error", { agentId, errorType: error instanceof Error ? error.name : "unknown" });
      if (!response.headersSent) response.status(500).json({ error: "memory_tool_failed" });
    } finally {
      await transport.close();
      await mcp.close();
    }
  });

  app.get("/mcp", (_request, response) => response.status(405).json({ error: "method_not_allowed" }));
  app.delete("/mcp", (_request, response) => response.status(405).json({ error: "method_not_allowed" }));

  const server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(config.port, config.host, (error?: Error) => {
      if (error) reject(error);
      else resolve(listener);
    });
    listener.once("error", reject);
  });
  return {
    server,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

export function createAgentServer(
  service: MemoryService,
  agentId: string,
  telemetry: MemoryTelemetry,
  grants: readonly AgentScopeGrant[],
): McpServer {
  const server = new McpServer({ name: "shared-memory", version: "0.1.0" });
  const controller = new MemoryToolController(service, agentId, grants);
  for (const name of MEMORY_TOOL_NAMES) {
    const inputSchema = memoryToolSchemas[name] as ZodType<Record<string, unknown>>;
    server.registerTool(
      name,
      {
        description: TOOL_DESCRIPTIONS[name],
        inputSchema,
        annotations: {
          readOnlyHint: READ_ONLY_TOOLS.has(name),
          destructiveHint: name === "memory_forget",
          openWorldHint: false,
        },
      },
      async (input: Record<string, unknown>) => {
        const started = performance.now();
        try {
          const result = await controller.call(name, input);
          if (name === "memory_health") {
            telemetry.event("memory.health", { agentId, tool: name });
          } else if (READ_ONLY_TOOLS.has(name)) {
            telemetry.event("memory.search", { agentId, tool: name });
            telemetry.event(result === null || (Array.isArray(result) && result.length === 0) ? "memory.miss" : "memory.hit", {
              agentId,
              tool: name,
            });
          } else {
            telemetry.event(name === "memory_create_handoff" ? "memory.handoff" : "memory.write", {
              agentId,
              tool: name,
            });
          }
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        } catch (error) {
          telemetry.event("memory.rejected", { agentId, tool: name, errorType: error instanceof Error ? error.name : "unknown" });
          return {
            isError: true,
            content: [{ type: "text" as const, text: error instanceof Error ? error.message : "Memory operation failed" }],
          };
        } finally {
          telemetry.observeLatency(name, performance.now() - started);
        }
      },
    );
  }
  return server;
}

function authenticate(
  headers: Record<string, string | string[] | undefined>,
  remoteAddress: string | undefined,
  config: AppConfig,
): string | null {
  const claimedAgent = singleHeader(headers["x-agent-id"]);
  if (claimedAgent && !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(claimedAgent)) return null;
  if (config.disableAuth) return claimedAgent && isLoopbackAddress(remoteAddress) ? claimedAgent : null;
  const authorization = singleHeader(headers.authorization);
  if (!authorization?.startsWith("Bearer ")) return null;
  const presented = authorization.slice("Bearer ".length);
  if (claimedAgent) {
    const expected = config.agentKeys[claimedAgent];
    return expected && safeEqual(presented, expected) ? claimedAgent : null;
  }
  return Object.entries(config.agentKeys).find(([, expected]) => safeEqual(presented, expected))?.[0] ?? null;
}

function singleHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function isLoopbackAddress(address: string | undefined): boolean {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}
