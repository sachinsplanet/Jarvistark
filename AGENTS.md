# AGENTS.md

Jarvistark is a system of record for intent. It turns a rough software idea into an explicit, versioned specification and derives implementation tasks and coding-agent prompts from it.

## The loop

1. A planner (you, the coding agent) proposes claims by calling `jarvistark propose`.
2. The engine validates the proposal and returns errors or minted IDs.
3. A person reviews and accepts, rejects, or edits the proposed claims.
4. Accepted claims are recorded in the ledger (append-only, hash-chained).
5. You call `jarvistark next` to pull the next ready task with assembled context.
6. You do the work and call `jarvistark done` with check evidence.
7. If the work shows the specification is wrong, file a change request as a proposal — do not edit `.jarvistark/ledger/` or `docs/plan/` directly.

## Where truth lives

- **Canonical data:** `.jarvistark/` (JSON/NDJSON, written only by the `jarvistark` command)
- **Generated docs:** `docs/plan/` (read-only Markdown with content-hash headers)
- **Architecture:** `docs/architecture.md`
- **Decisions:** `docs/decisions/`
- **Original specification:** `docs/spec/`

## Rules

- Never edit `.jarvistark/ledger/**` directly. Changes go through proposals.
- `docs/plan/` files are generated — do not hand-edit them.
- The `packages/core` boundary: no file, network, or model imports. Only port interfaces.
- Run `jarvistark validate` before committing to verify hash-chain and consistency.
