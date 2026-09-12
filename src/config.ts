export type AppConfig = {
  provider: "redis-agent-memory" | "in-memory";
  agentMemoryUrl: string;
  agentMemoryApiKey?: string;
  redisUrl?: string;
  host: string;
  port: number;
  disableAuth: boolean;
  agentKeys: Readonly<Record<string, string>>;
  agentGrants: Readonly<Record<string, readonly AgentScopeGrant[]>>;
  workingTtlSeconds: number;
  maxResults: number;
  minRelevance: number;
  maxContextTokens: number;
  maxContentBytes: number;
  requestTimeoutMs: number;
  maxRetries: number;
  rateLimitPerMinute: number;
};

export type AgentScopeGrant = {
  workspaceId: string;
  projectIds: readonly string[];
  allowGlobal?: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const provider = env.MEMORY_PROVIDER ?? "redis-agent-memory";
  if (provider !== "redis-agent-memory" && provider !== "in-memory") {
    throw new Error("MEMORY_PROVIDER must be redis-agent-memory or in-memory");
  }
  const host = env.MEMORY_MCP_HOST ?? "127.0.0.1";
  const disableAuth = parseBoolean(env.MEMORY_DISABLE_AUTH ?? "false");
  if (disableAuth && !isLoopbackHost(host)) {
    throw new Error("MEMORY_DISABLE_AUTH is allowed only on a loopback host");
  }
  const agentKeys = parseAgentKeys(env.MEMORY_AGENT_KEYS_JSON);
  const agentGrants = parseAgentGrants(env.MEMORY_AGENT_GRANTS_JSON);
  if (!disableAuth && Object.keys(agentKeys).length === 0) {
    throw new Error("MEMORY_AGENT_KEYS_JSON is required when authentication is enabled");
  }
  if (!disableAuth && Object.keys(agentKeys).some((agent) => !agentGrants[agent]?.length)) {
    throw new Error("MEMORY_AGENT_GRANTS_JSON must grant every authenticated agent at least one scope");
  }

  return {
    provider,
    agentMemoryUrl: parseUrl(env.AGENT_MEMORY_URL ?? "http://127.0.0.1:8000"),
    ...(env.AGENT_MEMORY_API_KEY ? { agentMemoryApiKey: env.AGENT_MEMORY_API_KEY } : {}),
    ...(env.REDIS_URL ? { redisUrl: parseRedisUrl(env.REDIS_URL) } : {}),
    host,
    port: parseInteger("MEMORY_MCP_PORT", env.MEMORY_MCP_PORT, 8787, 1, 65_535),
    disableAuth,
    agentKeys,
    agentGrants,
    workingTtlSeconds: parseInteger("MEMORY_WORKING_TTL_SECONDS", env.MEMORY_WORKING_TTL_SECONDS, 21_600, 1, 2_592_000),
    maxResults: parseInteger("MEMORY_MAX_RESULTS", env.MEMORY_MAX_RESULTS, 7, 1, 100),
    minRelevance: parseNumber("MEMORY_MIN_RELEVANCE", env.MEMORY_MIN_RELEVANCE, 0.25, 0, 1),
    maxContextTokens: parseInteger("MEMORY_MAX_CONTEXT_TOKENS", env.MEMORY_MAX_CONTEXT_TOKENS, 2_000, 1, 100_000),
    maxContentBytes: parseInteger("MEMORY_MAX_CONTENT_BYTES", env.MEMORY_MAX_CONTENT_BYTES, 16_384, 256, 1_048_576),
    requestTimeoutMs: parseInteger("MEMORY_REQUEST_TIMEOUT_MS", env.MEMORY_REQUEST_TIMEOUT_MS, 3_000, 100, 60_000),
    maxRetries: parseInteger("MEMORY_MAX_RETRIES", env.MEMORY_MAX_RETRIES, 2, 0, 10),
    rateLimitPerMinute: parseInteger("MEMORY_RATE_LIMIT_PER_MINUTE", env.MEMORY_RATE_LIMIT_PER_MINUTE, 120, 1, 100_000),
  };
}

function parseAgentGrants(raw: string | undefined): Readonly<Record<string, readonly AgentScopeGrant[]>> {
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("MEMORY_AGENT_GRANTS_JSON must be an object");
  }
  const result: Record<string, AgentScopeGrant[]> = {};
  for (const [agent, grants] of Object.entries(parsed as Record<string, unknown>)) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(agent) || !Array.isArray(grants) || grants.length === 0) {
      throw new Error("MEMORY_AGENT_GRANTS_JSON contains an invalid agent or empty grants");
    }
    result[agent] = grants.map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid memory scope grant");
      const grant = value as Record<string, unknown>;
      if (
        typeof grant.workspaceId !== "string" ||
        !/^[a-zA-Z0-9*][a-zA-Z0-9._:*-]{0,127}$/.test(grant.workspaceId) ||
        !Array.isArray(grant.projectIds) ||
        grant.projectIds.length === 0 ||
        grant.projectIds.some(
          (project) => typeof project !== "string" || !/^[a-zA-Z0-9*][a-zA-Z0-9._:*-]{0,127}$/.test(project),
        ) ||
        (grant.allowGlobal !== undefined && typeof grant.allowGlobal !== "boolean")
      ) {
        throw new Error("Invalid memory scope grant");
      }
      return {
        workspaceId: grant.workspaceId,
        projectIds: grant.projectIds as string[],
        ...(grant.allowGlobal === true ? { allowGlobal: true } : {}),
      };
    });
  }
  return result;
}

export function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function parseAgentKeys(raw: string | undefined): Readonly<Record<string, string>> {
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("MEMORY_AGENT_KEYS_JSON must be an object");
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (
    entries.some(
      ([agent, key]) =>
        !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(agent) ||
        typeof key !== "string" ||
        key.length < 24 ||
        /replace-with|change-me|example-key|placeholder|at-least-24-chars/i.test(key),
    )
  ) {
    throw new Error("MEMORY_AGENT_KEYS_JSON contains an invalid agent, short key, or example placeholder");
  }
  return Object.fromEntries(entries) as Record<string, string>;
}

function parseBoolean(value: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("Boolean configuration must be true or false");
}

function parseInteger(name: string, raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer between ${min} and ${max}`);
  return value;
}

function parseNumber(name: string, raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}`);
  return value;
}

function parseUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("AGENT_MEMORY_URL must use HTTP or HTTPS");
  return url.toString().replace(/\/$/, "");
}

function parseRedisUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") throw new Error("REDIS_URL must use redis or rediss");
  return url.toString();
}
