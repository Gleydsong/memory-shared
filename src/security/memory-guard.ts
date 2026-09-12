import type { MemoryScope } from "../domain/memory.js";

const SECRET_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { name: "bearer token", pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/i },
  { name: "JWT", pattern: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ },
  { name: "AWS access key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { name: "cookie", pattern: /\b(?:cookie|set-cookie)\s*:\s*[^\r\n]{12,}/i },
  { name: "credential URL", pattern: /\b(?:redis|rediss|postgres|postgresql|mysql):\/\/[^\s:@/]+:[^\s@/]+@/i },
  {
    name: "credential assignment",
    pattern:
      /\b(?:api[_-]?key|password|passwd|secret|token|oauth[_-]?token|redis_url|database_url)\s*[:=]\s*["']?(?!example|placeholder|redacted)[A-Za-z0-9_./+:-]{12,}/i,
  },
  { name: "provider token", pattern: /\b(?:sk-(?:proj-)?|gh[opusr]_|github_pat_)[A-Za-z0-9_-]{16,}\b/i },
];

const INJECTION_PATTERNS = [
  /\bignore\s+(?:all\s+)?(?:previous|prior|system)\s+instructions?\b/i,
  /\b(?:disable|bypass|remove)\s+(?:the\s+)?(?:security|authentication|authorization|guardrails?)\b/i,
  /\b(?:reveal|send|exfiltrate|print)\s+(?:the\s+)?(?:credentials?|secrets?|tokens?|passwords?)\b/i,
  /\bexecute\s+(?:this\s+)?(?:shell\s+)?command\b/i,
];

export class MemoryPolicyError extends Error {
  readonly code: "INVALID_SCOPE" | "SECRET_DETECTED" | "INSTRUCTION_DETECTED" | "INVALID_CONTENT";

  constructor(
    code: MemoryPolicyError["code"],
    message: string,
  ) {
    super(message);
    this.name = "MemoryPolicyError";
    this.code = code;
  }
}

export function assertSafeScope(scope: MemoryScope): void {
  const identifiers = [scope.workspaceId, scope.projectId, scope.sessionId, scope.agentId];
  for (const value of identifiers) {
    if (value !== undefined && !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value)) {
      throw new MemoryPolicyError("INVALID_SCOPE", "Memory scope contains an invalid identifier");
    }
  }
  if (scope.namespace !== "*" && !/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,127}$/.test(scope.namespace)) {
    throw new MemoryPolicyError("INVALID_SCOPE", "Memory namespace is invalid");
  }
}

export function assertWritableScope(scope: MemoryScope): void {
  assertSafeScope(scope);
  if (scope.namespace === "*") {
    throw new MemoryPolicyError("INVALID_SCOPE", "Wildcard namespace is read-only");
  }
}

export function assertSafeMemoryContent(content: string, maxBytes: number): void {
  if (content.trim().length === 0 || Buffer.byteLength(content, "utf8") > maxBytes) {
    throw new MemoryPolicyError("INVALID_CONTENT", "Memory content is empty or oversized");
  }
  const secret = SECRET_PATTERNS.find(({ pattern }) => pattern.test(content));
  if (secret) {
    throw new MemoryPolicyError("SECRET_DETECTED", `Memory rejected: possible ${secret.name} secret detected`);
  }
  if (INJECTION_PATTERNS.some((pattern) => pattern.test(content))) {
    throw new MemoryPolicyError(
      "INSTRUCTION_DETECTED",
      "Memory rejected: arbitrary instruction or prompt injection detected",
    );
  }
}

export function normalizeMemoryText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
