import type { AgentScopeGrant } from "../config.js";
import type { MemoryScope } from "../domain/memory.js";

export type DoctorCheck = [name: string, healthy: boolean];

export function evaluateMemoryDiagnostics(healthResult: unknown, semanticResult: unknown): DoctorCheck[] {
  const healthPayload = extractToolJson(healthResult);
  return [
    [
      "Redis / Agent Memory",
      healthPayload.status === "healthy" && healthPayload.redis === "healthy",
    ],
    ["MCP protocol", isToolResult(healthResult)],
    ["Semantic search", isToolResult(semanticResult) && semanticResult.isError !== true],
  ];
}

export function selectSemanticProbeScope(grants: readonly AgentScopeGrant[]): MemoryScope | null {
  const grant = grants.find(({ workspaceId }) => workspaceId !== "*");
  if (!grant) return null;
  const projectId = grant.projectIds.includes("*")
    ? "shared-memory-healthcheck"
    : grant.projectIds[0];
  if (!projectId) return null;
  return {
    workspaceId: grant.workspaceId,
    projectId,
    namespace: "decisions",
    agentId: "orca",
  };
}

function isToolResult(result: unknown): result is { isError?: boolean; content?: unknown } {
  return Boolean(result && typeof result === "object");
}

function extractToolJson(result: unknown): Record<string, unknown> {
  if (!isToolResult(result) || !Array.isArray(result.content)) return {};
  const text = result.content.find(
    (item): item is { type: "text"; text: string } =>
      Boolean(
        item &&
          typeof item === "object" &&
          (item as { type?: unknown }).type === "text" &&
          typeof (item as { text?: unknown }).text === "string",
      ),
  )?.text;
  if (!text) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
