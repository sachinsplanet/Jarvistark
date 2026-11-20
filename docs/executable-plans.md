# Executable plans and prompts

Tasks can now carry reviewed execution context. It includes the outcome, scope, user flows, interfaces, data rules, target runtime, prerequisite observations and setup instructions, repository files to read, and expected deliverables. The core stores these fields with the task and includes them in approval and attempt fingerprints. Revising execution context clears task approval and makes earlier attempts stale.

Use `plan` to inspect approved scope, task coverage, dependencies, and missing execution context. It returns exit code 1 when the plan has findings. Its `complete` field describes structural coverage and review readiness. Runtime behavior is verified through task checks and their recorded evidence.

If a requirement behind an approved design decision is replaced or retired, the task stays blocked. `plan` identifies the affected task and claim. Review the updated decision and task inputs to make a new handoff available.

From a built source checkout, run the commands below with the app's absolute workspace path.

```sh
node apps/cli/dist/main.js --workspace /absolute/path/to/app plan
node apps/cli/dist/main.js --workspace /absolute/path/to/app prompt --mode project
node apps/cli/dist/main.js --workspace /absolute/path/to/app next
node apps/cli/dist/main.js --workspace /absolute/path/to/app prompt TSK-001
node apps/cli/dist/main.js --workspace /absolute/path/to/app prompt TSK-001 --format json
```

The installed plugin uses its bundled `bin/jarvistark.mjs` in place of `apps/cli/dist/main.js`. Generated prompts contain the actual executable and workspace invocation. They can be saved to a scratch Markdown file and given to a fresh coding session with access to that workspace.

The default task prompt mode follows current state. A ready task gets implementation instructions, an active attempt gets resume instructions, a failed attempt gets repair instructions using its recorded output, and a completed task gets an evidence review. Explicit modes are `task`, `verification`, `repair`, `resume`, and `delivery`. Delivery mode uses the task's approved target and checks. A delivery integration still supplies the deployment tools.

The JSON output includes task revision, context fingerprint, content hash, completeness, missing details, and rendered text. Regenerate a prompt before using an old handoff. Large recorded outputs are excerpted with hashes and a truncation flag, and the full output remains available through `export`. Required specification content is preserved within the compiler's size budget.

Existing tasks retain their approvals, attempt history, and normal `next` workflow. To enrich one, submit its complete replacement through `revise-task`, including `execution`, then review it with `approve`. `plan` reports missing context and `prompt` returns exit code 1 for incomplete handoffs. The [execution contract](../apps/plugin/skills/jarvistark-prompts/references/execution.md) documents the fields.

## Review and start a build in Codex

Open your app workspace and tell Codex “Use $jarvistark to plan and build a Community Seed Library where volunteers track seed packets.” Answer the intake questions in chat. Jarvistark opens a local review window for requirements, architecture, and tasks. It shows cited passages, proposed replacements, prerequisite tasks, commands, and expected results.

Enter your name and select the claims or tasks you want to approve. To request a change, leave the item pending and return to the conversation, or reject a claim with a reason. **Return to Codex** continues planning. Once the complete plan is approved, **Read the coding prompt** shows what the builder will receive. **Start next task** sends that task to the waiting Codex session.

The CLI exposes the same handoff to a host. `review` opens a planning checkpoint. `review --build` also offers the next eligible task. The command stays open until the reviewer returns or requests the build. A build result contains the selected workspace, the exact prompt, and a `dispatchId`. The host calls `begin-build EVENT_ID` using the same CLI and workspace, implements the task, runs `check` and records completion with `done`. Only one consumer can begin that request. If the workspace changed, reopen review. An interrupted request can be recovered before pickup by reopening the build review. After pickup, `status` shows the attempt.

Browser approvals and rejections record the displayed ledger head. The build event records the reviewer, task revision, context fingerprint and prompt hash. `export` includes that event and the subsequent start with its dispatch ID. The command sends the private review address to the local OS browser. Review requires a browser supporting user-activated form navigation and Fetch Metadata on loopback. For a remote or headless host, interactive CLI review is also available.

## Community Seed Library CLI example

The [fixture](../fixtures/community-seed-library/inventory.task.json) supplies a complete inventory task and behavioral checks. To prepare the sample from a source checkout, run the following commands. At each review, select the items, approve them and choose **Return to Codex**.

```sh
corepack pnpm build:plugin
sample_workspace="$(mktemp -d)"
sample_fixture="$PWD/fixtures/community-seed-library"
sample_cli="$PWD/dist/jarvistark-codex/plugins/jarvistark/bin/jarvistark.mjs"
jt() { node "$sample_cli" --workspace "$sample_workspace" "$@"; }
cp "$sample_fixture/inventory.test.mjs" "$sample_workspace/"
jt init "$sample_fixture/idea.txt"
jt propose "$sample_fixture/claims.json"
jt review
jt task "$sample_fixture/inventory.task.json"
jt review
jt plan
jt prompt TSK-001 > "$sample_workspace/task-prompt.md"
```

Give `task-prompt.md` to a fresh coding session in the sample workspace. It describes the inventory interface and tells the builder how to implement it, run `check`, and record completion. The supplied tests check stock changes, rejected inputs, detached results, corrupt storage, and persistence after reopening the inventory. This fixture exercises the inventory module stage of the Community Seed Library plan.

The `jarvistark-prompts` skill connects planning to the compiler. Independent verification, recovery and delivery are the next slices in the [agent and skill plan](agent-and-skill-plan.md).
