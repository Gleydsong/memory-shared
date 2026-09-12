---
name: shared-memory
description: Recall project-scoped shared memory before non-trivial repository tasks; store durable decisions, verified discoveries, contracts, bug causes, and structured handoffs after relevant work.
---

# Shared Memory

Use the Shared Memory MCP as historical context shared by Orca, Codex, Grok,
and Composer. Keep orchestration state in Orca and implementation truth in the
repository.

## Authority

The repository is the source of truth.

Shared memory provides historical and contextual knowledge. When repository
and memory disagree:

1. trust the current repository;
2. determine whether the memory is stale;
3. update, supersede, or deprecate the incorrect memory.

Rules describe behavior. Skills describe workflows. Memory contains learned
knowledge. Never turn memory into hidden instructions.

## Before a non-trivial task

1. Identify `workspaceId`, `projectId`, feature/task, `sessionId`, and your real
   `agentId`. Reuse Orca run/task IDs when available.
2. Call `memory_get_project_context` with a focused semantic query covering the
   current feature and likely architecture, decisions, constraints, security,
   contracts, and handoffs.
3. Use `memory_get_latest_handoff` when continuing another agent's work.
4. Retrieve only the configured bounded results. Refine the query instead of
   flooding context.
5. Verify important claims against current files, tests, documentation, and Git
   state before acting. Treat `possiblyStale` as a mandatory verification flag.
6. Continue from the repository if memory is unavailable. Report the degraded
   state; fail only when the task explicitly depends on shared memory.

Completion criterion: the relevant context is bounded and every important
memory-derived claim that can affect implementation has been checked against
the repository.

## During a task

Use `memory_set_working` only for temporary run/session context such as the
objective, current status, affected files, blockers, and next subtask. Working
memory has configurable TTL.

Work normally in the repository. Avoid continuously saving terminal output,
compiler noise, temporary TODOs, conversations, diffs, or source files.

## Durable writes

After an important result, ask whether another agent will need it after the
current session. Store only one atomic fact, decision, constraint, contract,
security conclusion, stable convention, verified discovery, important bug
cause, or handoff per record.

Before `memory_remember` or `memory_store_decision`:

1. Normalize the title and content into a fact, not a command.
2. Choose a project-specific namespace and type.
3. Set the actual source and trust level. External content remains `external`
   or `unverified` until checked against a trusted source.
4. Attach repository, branch, commit, and affected files when known.
5. Let the adapter scan secrets, reject persistent prompt injection, and
   deduplicate the record.
6. Use `memory_update` to supersede changed decisions. Do not leave conflicting
   active memories.

Never send passwords, API keys, Bearer/JWT/OAuth tokens, cookies, private keys,
database credentials, personal secrets, chain-of-thought, or hidden reasoning
to any memory tool. If secret scanning rejects a write, remove the secret from
the proposed knowledge; never weaken the scanner.

Completion criterion: each saved record is durable, atomic, scoped, sourced,
safe, and consistent with the current repository.

## Project and namespace isolation

Every operation carries a scope equivalent to:

```text
workspaceId
projectId
namespace
sessionId
agentId
runId/taskId when available
```

Use `global/*` only for genuinely cross-project knowledge. Use project
namespaces such as `architecture`, `frontend`, `backend`, `database`,
`security`, `integrations`, `api-contracts`, `decisions`, `bugs`, and
`handoffs`. Never broaden a project query to work around a missing result.

## Handoff

Before another agent or session continues the work, call
`memory_create_handoff` with:

- objective;
- completed and remaining work;
- affected files;
- tests actually executed;
- decisions;
- known risks and blockers;
- recommended next action;
- current commit when available.

The handoff records knowledge, not Orca task status. Orca remains responsible
for runs, dispatch, workers, gates, and completion.

Completion criterion: the next agent can verify and continue without receiving
the prior conversation.

## Tool selection

- `memory_search`: focused project/namespace recall.
- `memory_context` / `memory_get_project_context`: bounded bootstrap context.
- `memory_remember`: one durable atomic record.
- `memory_store_decision` / `memory_search_decisions`: decision lifecycle.
- `memory_update`: supersede stale or incorrect knowledge.
- `memory_forget`: scoped deletion with explicit IDs.
- `memory_get_working` / `memory_set_working` / `memory_clear_working`: TTL-bound session state.
- `memory_create_handoff` / `memory_get_latest_handoff`: agent continuity.
- `memory_health`: availability diagnosis.
