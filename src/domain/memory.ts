export const MEMORY_TYPES = [
  "architecture",
  "decision",
  "constraint",
  "api-contract",
  "security",
  "bug",
  "discovery",
  "handoff",
  "preference",
  "convention",
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];
export type MemoryStatus = "active" | "superseded" | "deprecated";
export type TrustLevel = "trusted" | "verified" | "unverified" | "external";
export type MemorySource =
  | "user"
  | "repository"
  | "codex"
  | "grok"
  | "composer"
  | "orca"
  | "external";

export type MemoryScope = {
  workspaceId: string;
  projectId?: string;
  namespace: string;
  sessionId?: string;
  agentId: string;
  runId?: string;
  taskId?: string;
  featureId?: string;
};

export type MemoryMetadata = {
  agent?: string;
  runId?: string;
  taskId?: string;
  feature?: string;
  files?: string[];
  confidence?: number;
  source: MemorySource;
  trustLevel: TrustLevel;
  repository?: string;
  branch?: string;
  sourceCommit?: string;
  createdAt: string;
  updatedAt: string;
  fingerprint: string;
};

export type MemoryRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  namespace: string;
  type: MemoryType;
  title: string;
  content: string;
  status: MemoryStatus;
  supersededBy?: string;
  metadata: MemoryMetadata;
  relevance?: number;
  possiblyStale?: boolean;
};

export type RememberInput = {
  scope: MemoryScope;
  type: MemoryType;
  title: string;
  content: string;
  metadata: Omit<MemoryMetadata, "createdAt" | "updatedAt" | "fingerprint">;
};

export type SearchRequest = {
  scope: MemoryScope;
  query: string;
  types?: MemoryType[];
  statuses?: MemoryStatus[];
  limit?: number;
  minRelevance?: number;
  searchMode?: "semantic" | "keyword" | "hybrid";
  currentCommit?: string;
};

export type WorkingMemory = {
  scope: MemoryScope;
  data: Record<string, unknown>;
  ttlSeconds: number;
  updatedAt: string;
};

export type AgentHandoff = {
  fromAgent: string;
  toAgent?: string;
  projectId: string;
  runId?: string;
  taskId?: string;
  objective: string;
  completed: string[];
  remaining: string[];
  affectedFiles: string[];
  testsExecuted: string[];
  decisions: string[];
  knownRisks: string[];
  blockers: string[];
  recommendedNextAction?: string;
  commit?: string;
  timestamp: string;
};

export type ProviderCapabilities = {
  semanticSearch: boolean;
  keywordSearch: boolean;
  hybridSearch: boolean;
  metadataFiltering: boolean;
  extraction: boolean;
  summarization: boolean;
  deduplication: boolean;
};

export type HealthStatus = {
  status: "healthy" | "degraded" | "unhealthy";
  provider: string;
  redis: "healthy" | "unhealthy" | "unknown";
  latencyMs: number;
  detail?: string;
};
