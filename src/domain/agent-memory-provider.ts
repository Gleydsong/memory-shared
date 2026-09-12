import type {
  AgentHandoff,
  HealthStatus,
  MemoryRecord,
  MemoryScope,
  ProviderCapabilities,
  SearchRequest,
  WorkingMemory,
} from "./memory.js";

export interface AgentMemoryProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  search(request: SearchRequest): Promise<MemoryRecord[]>;
  remember(memory: MemoryRecord): Promise<MemoryRecord>;
  get(id: string, scope: MemoryScope): Promise<MemoryRecord | null>;
  update(memory: MemoryRecord): Promise<MemoryRecord>;
  forget(ids: string[], scope: MemoryScope): Promise<void>;

  getWorkingMemory(scope: MemoryScope): Promise<WorkingMemory | null>;
  setWorkingMemory(memory: WorkingMemory): Promise<void>;
  deleteWorkingMemory(scope: MemoryScope): Promise<void>;

  createHandoff(handoff: AgentHandoff, scope: MemoryScope): Promise<MemoryRecord>;
  health(): Promise<HealthStatus>;
}
