# Security Policy

## Supported use

This project is a **localhost development MCP**. The intended deployment binds
the MCP to loopback, keeps Redis and the Agent Memory API on a private Docker
network, and authenticates every `/mcp` call with a unique per-agent key.

Do not publish Redis, the Agent Memory API, `/health`, or `/metrics` to an
untrusted network. Do not copy example keys from `.env.example` into a running
process. Do not grant `workspaceId: "*"` unless every agent is trusted with
every workspace.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security reports.

Use GitHub's private [vulnerability reporting](https://github.com/Gleydsong/memory-shared/security/advisories/new)
for this repository, or contact the maintainer through a private channel.

Include:

- a description of the issue and impact
- reproduction steps against a local clone you control
- affected version / commit when known

Do not attach `.env` files, live MCP keys, or memory payloads that may contain
secrets.
