# D2 — Orchestration level

**Status:** accepted  
**Date:** 2026-10-15  
**Decide by:** before building the first shell (build-order step 5)

## Decision

Build the **guided loop** first — the agent pulls tasks and reports evidence. Add the orchestrator (subagent per task, gates at milestones) as another consumer later.

## Options considered

**Handoff only** — Jarvistark exports prompts, the user manually feeds them to an agent.

- Simplest to build, but loses the feedback loop that makes the ledger valuable.

**Guided loop** (chosen) — the agent asks for the next ready task, receives assembled context, does the work, and reports check results with evidence.

- The natural substrate: an orchestrator is just automation of this same loop.
- Exercises the full core: graph walk, context assembly, evidence recording, staleness propagation.

**Orchestrated** — a subagent per task, with gates at milestones.

- v1 as originally scoped. Possible later as another consumer of the same ledger.
- Requires reliable subagent lifecycle management and milestone logic.

## Consequences

- The core exposes `next` (pull next ready task with context) and `done` (record evidence).
- CLI commands: `jarvistark next` and `jarvistark done`.
- Plugin skill: the host agent calls these in a loop, pausing for the person at approval checkpoints.
- The orchestrator is a future consumer, not a prerequisite.
