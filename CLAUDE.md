# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Jarvistark is

A system of record for intent: it turns a rough software idea into an explicit, versioned specification and derives implementation tasks and coding-agent prompts from that specification. It is not a chatbot, foundation model, or autonomous code generator.

## Commands

```bash
pnpm install                                       # install workspace dependencies
pnpm build                                         # build all workspace packages
pnpm typecheck                                     # typecheck across workspace
pnpm lint                                          # check formatting & lint rules (Biome)
pnpm lint:fix                                      # format & auto-fix lint issues (Biome)
pnpm vitest run                                    # run all tests non-interactively
pnpm vitest run packages/core/test/core.test.ts    # run a single test file
pnpm test:ci                                       # run workspace test suite via pnpm -r test -- --run
pnpm --filter @jarvistark/core test -- --run       # run tests for a single package
```

> **Warning:** Vitest defaults to watch mode unless `--run` or `vitest run` is used. Always run non-interactive test commands to avoid hanging subagent or CLI sessions.

## Tech stack

- **Language/runtime:** TypeScript, Node.js 22+ (LTS)
- **Package management:** pnpm workspaces (monorepo)
- **Schemas:** Zod (runtime validation), JSON Schema (portable)
- **Lint/format:** Biome (tabs, double quotes, semicolons)
- **Tests:** Vitest
- **Canonical data:** JSON / NDJSON canonical; generated Markdown is read-only with SHA-256 content-hash headers

## High-Level Architecture (The Six Mechanisms)

1. **Claims with three axes** — Unified claim schema with `kind` (requirement/constraint/assumption/question/decision), `origin` (user-stated/inferred/recommended/observed), and `state` (proposed/accepted/rejected/superseded). User-stated claims must point to a span of the original input. Acceptance strictly requires recorded human approval.
2. **Proposals, not writes** — Models/agents submit typed patches (add/revise/retire/link) with provisional keys. The engine validates, mints immutable IDs (never reused), and appends an event to the ledger. Models never edit accepted claims in place.
3. **Build graph, not linear pipeline** — Derived artifacts record the content hashes of their input claims. When any claim changes, downstream artifacts are flagged stale. Project phase is computed dynamically from artifact states, not stored as an enum.
4. **Profiles** — The core engine is domain-agnostic. A profile (e.g. `profiles/accounts-database/`) supplies domain-specific intake questions, decomposition checklists, environment defaults, validator rules, and support boundaries. Profiles are data-only (no executable TypeScript).
5. **Pull with evidence** — Guided loop workflow. Agents pull the next ready task via `jarvistark next`; context is assembled through a deterministic graph walk under a strict token budget. Task completion is reported via `jarvistark done` with structured test/execution evidence.
6. **Enforcement outside the model** — Model instructions are advisory; deterministic validators and CI hash checks provide enforcement. Canonical files are written exclusively by the Jarvistark engine; manual or out-of-band edits are rejected by content hash.

## Core Boundary Rule

`packages/core` must have **zero imports** of file system (`node:fs`), network (`node:http`, `node:net`), or external model APIs. It interacts with the outside world strictly through abstract interfaces in `packages/core/src/ports/` (storage, scanner, runner, model). Any direct I/O import in `packages/core` violates architectural invariants.

## Data Locations & Canonical Truth

- **Canonical State:** `.jarvistark/` (JSON and hash-chained NDJSON ledger events, written only by Jarvistark commands). Never manually edit `.jarvistark/ledger/**`.
- **Generated Views:** `docs/plan/` (read-only Markdown generated with `<!-- content-hash: sha256:... -->` headers). Do not edit manually; edits will cause `jarvistark validate` failures.
- **Specification History:** `docs/spec/` (Master specification and concept drafts).
- **Decisions:** `docs/decisions/` (Architecture Decision Records: D1 shape, D2 orchestration, D3 canonical format).

## Settled Architectural Decisions

- **D1 — Shape:** Skill pack / plugin inside the coding agent first (`apps/plugin`), built on a shell-agnostic core (`packages/core`). Standalone CLI (`apps/cli`) follows.
- **D2 — Orchestration:** Guided loop first (agent pulls tasks and reports evidence) rather than full autonomous multi-agent orchestration.
- **D3 — Canonical format:** JSON/NDJSON canonical. Markdown in `docs/plan/` is generated and read-only.

## Build Order & Status

The project follows a staged build sequence:
1. **Settle open decisions:** Complete (D1, D2, D3 accepted in `docs/decisions/`).
2. **Hand-run pipeline:** Collect realistic idea-to-spec runs in `fixtures/`.
3. **Build the gate in isolation:** Current focus — implement `packages/core` (claim/proposal schemas, ID minting, approval events, hash-chained ledger, deterministic validators, and ports).
4. **Deterministic rendering:** Task ordering, context assembly under token budget, prompt templates.
5. **First shell:** Plugin for coding agents, then CLI.
