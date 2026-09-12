const SENSITIVE_FIELD = /(?:authorization|api.?key|password|secret|token|cookie|content|payload)/i;

export type MemoryEvent =
  | "memory.search"
  | "memory.hit"
  | "memory.miss"
  | "memory.write"
  | "memory.update"
  | "memory.deduplicated"
  | "memory.rejected"
  | "memory.handoff"
  | "memory.health"
  | "memory.mcp_error";

export class MemoryTelemetry {
  readonly #counts = new Map<string, number>();

  event(name: MemoryEvent, fields: Record<string, unknown> = {}): void {
    this.#counts.set(name, (this.#counts.get(name) ?? 0) + 1);
    const safeFields = Object.fromEntries(Object.entries(fields).filter(([key]) => !SENSITIVE_FIELD.test(key)));
    process.stderr.write(`${JSON.stringify({ level: "info", event: name, at: new Date().toISOString(), ...safeFields })}\n`);
  }

  observeLatency(operation: string, latencyMs: number): void {
    const bucket = `latency.${operation}.milliseconds_total`;
    this.#counts.set(bucket, (this.#counts.get(bucket) ?? 0) + Math.max(0, latencyMs));
  }

  prometheus(): string {
    return [...this.#counts.entries()]
      .map(([name, value]) => `shared_memory_${name.replaceAll(".", "_")} ${value}`)
      .join("\n");
  }
}
