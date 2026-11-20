# Guided workflow: core and CLI slice

This slice supports an approved specification, reviewed task/check definitions, dependency-aware task selection, real local check execution, completion, restart, and explicit revision. The host agent still plans the work; the engine validates and records it. It does not generate an architecture or implement the user's application by itself.

## Build and run

Use Node 22 or later and the repository's pinned pnpm version:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm jarvistark --help
corepack pnpm test:ci
```

`corepack pnpm jarvistark --workspace /absolute/path/to/app COMMAND` runs the CLI without a global installation. After building, `node /absolute/path/to/Jarvistark/apps/cli/dist/main.js` is equivalent. JSON file arguments are resolved from the invoking directory; check commands run in the selected app workspace.

In Codex, the entry skill opens the [workspace review](executable-plans.md#review-and-start-a-build-in-codex) during planning. The following commands also support direct terminal use.

## Normal use

1. `init idea.txt` records the original input once. Later changes use proposals.
2. `clarify answer.json` records `{ "sessionId": "SESS-001", "question": { "id": "Q1", "text": "...", "answer": "...", "answeredAt": "2026-11-16T10:00:00.000Z" } }`. Answers are immutable; corrections need a new question ID.
3. `propose claims.json` validates a proposal and returns minted claim IDs. A revision creates a new proposed claim; it does not replace the old claim until approved.
4. `approve CLM-001 CLM-002 --by YOUR_NAME` displays the exact claims and requires interactive confirmation. Questions must be answered through a proposed decision revision, or explicitly rejected with a reason.
5. `task task.json` records a proposed task. Its input contains `title`, `needs` (claim IDs), `dependsOn` (task IDs), and nonempty `checks` with `command` and `expect`. IDs, execution state, and evidence are engine-owned.
6. `approve TSK-001 --by YOUR_NAME` reviews the exact task and commands. No task can start before its inputs and definition are accepted.
7. `next` returns an eligible task and deterministic prompt. `status` explains blocked tasks. `start TSK-001` begins an attempt.
8. `check TSK-001` runs all approved check commands. It records actual combined output, exit status, executor, time, and the attempt's specification fingerprint. A nonzero command, timeout, or output-limit violation fails the check.
9. `done TSK-001` requires the latest result for every check in the current attempt to be passing and runner-verified. Dependents become eligible automatically. If a check fails, repair the code and `start` a fresh attempt before checking again; prior evidence remains available.
10. `validate` verifies the journal and structural consistency. `export` prints a complete versioned journal including proposals, approvals, and evidence.

`evidence TSK-001 evidence.json` accepts externally reported results with `checkId`, `command`, `executedBy`, `output`, `exitCode`, and `at`. These remain **self-reported** and cannot satisfy the runner requirement. Supplying an `attestation` field is rejected.

For an approved requirement change: submit a revision, obtain approval, then `revise-task TSK-001 revised-task.json` with the new claim IDs and checks. Review the revised task, start a fresh attempt, and rerun checks. Old attempts remain in history. Completed downstream work becomes blocked when its prerequisites cease to be current.

## Storage and trust boundaries

The only canonical repository file in this slice is `.jarvistark/ledger/events.ndjson`. Each transaction's last event includes a complete, schema-versioned snapshot covered by its event hash. The snapshot includes original input, clarifications, claims, proposals, links, task definitions, approvals, and evidence. State is loaded from the last verified snapshot; no separately editable claim/task cache is trusted. This favors correctness and simple recovery over journal size; snapshots can be compacted in a later format version.

The file adapter locks, compares the expected ledger head, writes and syncs a complete temporary journal, and atomically renames it. Previous event contents are preserved. Concurrent stale writers fail rather than overwrite each other. A crashed process before rename leaves the previous journal usable; a crash after rename leaves the new journal usable. Full power-loss durability across all filesystems is not promised. An abandoned `write.lock` is never automatically broken: verify its recorded PID is no longer running, preserve the journal, then remove only that stale lock. Orphan `.events-*.tmp` files are not canonical.

Hash chaining detects edits without recomputing the chain. It is not a digital signature or protection against someone who controls the whole repository and rewrites all history. Keep the journal in version control and review changes. The core's approval identity is an attestation, not authenticated identity. The CLI supports local browser review and interactive terminal review. In either case the human operates the review surface. The browser session uses a private loopback URL and same-origin form navigation. A host that controls the reviewer’s OS or browser is outside this trust boundary.

The local runner executes reviewed commands with the user's workspace permissions; it is not a security sandbox. It has a two-minute timeout and a 1 MiB output limit. A zero exit status proves only that the specified command succeeded; meaningful behavioral tests are part of the reviewed task. Evidence is bound to the task/specification and attempt, not to a cryptographic snapshot of every source file. Rerun checks after code changes. Repository-fingerprint binding and stronger execution isolation remain future work.

The packaged workspace review reads and writes the selected app’s journal through the same storage adapter as the CLI. The standalone Vite prototype keeps its demo journal in browser storage. The [planning skill](../apps/plugin/skills/jarvistark/SKILL.md) uses the packaged review for project decisions and dispatch.

## Freelancer tracker verification

From the Jarvistark repository root, build the CLI and create a disposable workspace. The fixture uses Node's built-in test runner.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
fixture="$PWD/fixtures/freelancer-tracker"
workspace="$(mktemp -d)"
cli="$PWD/apps/cli/dist/main.js"
jt() { node "$cli" --workspace "$workspace" "$@"; }

cp "$fixture"/*.test.mjs "$workspace/"
cp "$fixture/tracker.initial.mjs" "$workspace/tracker.mjs"
jt init "$fixture/idea.txt"
jt propose "$fixture/claims.json"
jt task "$fixture/projects.task.json"
jt task "$fixture/earnings.task.json"
jt next  # No task is ready before approval.
```

Run each approval in an interactive terminal. Review the claims or commands and type the exact phrase shown at the prompt, for example `approve CLM-001 CLM-002 CLM-003`.

```sh
jt approve CLM-001 CLM-002 CLM-003 --by "$USER"
jt approve TSK-001 TSK-002 --by "$USER"
jt next  # TSK-001 and its implementation prompt.
jt start TSK-001
jt check TSK-001
jt done TSK-001
jt next  # TSK-002 is now ready.
jt start TSK-002
jt check TSK-002  # Expected to fail because earnings are unimplemented.
jt done TSK-002   # Expected to fail because the check did not pass.
```

Apply the fixture's earnings implementation and retry. Each `jt` invocation is a new process that loads the journal, so `status` can recover progress at any point.

```sh
cp "$fixture/tracker.complete.mjs" "$workspace/tracker.mjs"
jt start TSK-002
jt check TSK-002
jt done TSK-002
jt validate
jt status  # Both tasks are done. The earnings task retains its failed attempt.
```

To exercise a requirement change, approve the rounding requirement and revise the earnings task. The previous completion is stale until the revised task passes its own checks.

```sh
jt propose "$fixture/revision.json"
jt approve CLM-004 --by "$USER"
jt status  # TSK-002 is blocked; it references the superseded claim.
jt revise-task TSK-002 "$fixture/earnings.revised.task.json"
jt approve TSK-002 --by "$USER"
jt start TSK-002
jt check TSK-002  # Expected to fail the new rounding test.
cp "$fixture/tracker.revised.mjs" "$workspace/tracker.mjs"
jt start TSK-002
jt check TSK-002
jt done TSK-002
jt validate
jt status
```

`apps/cli/test/workflow.test.ts` executes the fixture in `fixtures/freelancer-tracker` in a fresh temporary repository. It uses a synthetic reviewer only through the test's injected I/O interface; the shipped executable cannot auto-approve.

The fixture is deliberately an in-memory library, not a complete SaaS app. Its tests exercise ownership, rate validation, time entries, per-project earnings, and a later whole-cent rounding requirement. The sequence checks blocked/unapproved work, denied noninteractive approval, completion without evidence, successful project checks, failed earnings checks, repair, restart across separate CLI processes, approved revision, stale evidence rejection, re-verification, export, and corruption detection. Additional core/storage tests cover invalid proposals, transaction failures, stale writers, immutable intake, and detached accessors.
