# D1 — Shape

**Status:** accepted  
**Date:** 2026-10-15  
**Decide by:** before building the first shell (build-order step 5)

## Decision

Build a **skill pack (plugin) inside the coding agent** first, on a shell-agnostic core, so the standalone platform stays possible.

## Options considered

**A. Standalone platform** — CLI, MCP server, VS Code extension, web app, provider adapters, bring-your-own-key.

- Needs provider-key and data-egress machinery (§7.3, §15) and a model adapter per provider.
- More moving parts before anything works end-to-end.

**B. Skill pack inside the coding agent** (chosen) — the agent plays the planner, no server.

- No model calls needed — the host agent's model does the planning.
- Approval enforcement depends on what each host supports (hooks, permission rules, elicitation), with the CI hash check as the backstop.
- Fastest path to a working end-to-end workflow.

## Consequences

- `packages/core` is built with no model dependency. Provider adapters are deferred.
- The first shell is `apps/plugin` (skill pack for Claude Code, Codex, etc.), followed by `apps/cli` for standalone use.
- `apps/mcp-server`, `apps/vscode-extension`, `apps/web` come later, each on the same core.
- Security: approval enforcement in the plugin relies on the host's permission model + CI hash-chain validation.
