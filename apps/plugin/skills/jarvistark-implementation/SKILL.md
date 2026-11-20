---
name: jarvistark-implementation
description: Implement the next approved Jarvistark task or resume an existing attempt. Use to pull approved context, make scoped code changes, run recorded acceptance checks through the CLI, and complete the task with runner evidence.
---

Deliver one approved task unless the user asks for a broader run. Use the CLI invocation from the handoff or [the bundled CLI](../jarvistark/references/cli.md). Use that invocation and the same app workspace for selection, execution, and evidence. See [CLI execution and evidence](references/execution.md) for state transitions and recovery steps.

For a browser build handoff, use its workspace and run `begin-build DISPATCH_ID` once. A successful claim starts the attempt and returns the reviewed prompt. If the coordinator already supplies that claim and attempt ID, continue it. If pickup fails, inspect status and return the conflict to the coordinator. Carry out the prompt and finish with the checks in steps 3 and 4.

1. **Pull current work for a direct implementation request.** Run `jarvistark --workspace APP_DIR next`. Read the returned task, state, approved context, and exact checks. If no task is available, use `status` to explain whether work is complete, awaiting review, or blocked. Use the verified invocation even if a generated prompt shows bare commands.
2. **Start or resume the attempt.** Inspect the app and existing changes. Work within the task title and acceptance checks. Linked requirements and architecture explain the task's context. Use `start TASK_ID` for a ready task or a retry of a failed task. If it is in progress, resume its current attempt. If the task or its approved inputs change, reload `status` and use the current approved definition.
3. **Implement and verify.** Make the smallest change that delivers the task. Write the named tests if needed and make them assert the approved behavior. Run `check TASK_ID` to execute all approved checks through the runner. Ordinary test commands can help diagnose a failure, while `check` is what records runner evidence. When a check fails, inspect its real output, fix the code within scope, and start a new attempt before rerunning the checks. Retain earlier attempts. If the fix requires changing the specification or check, surface the issue for review instead of changing the approved contract during execution.
4. **Complete and report.** After the latest checks pass, run `done TASK_ID`. If you change code after checking, rerun the approved checks before completing. Verify the task is recorded done and run `validate`. Summarize the implementation, acceptance commands and results, and any remaining blocker. Read `next` to identify what the completion unlocked. Begin that work only if it is within the user's requested scope.

Keep approvals with the human reviewer. Use CLI proposals for specification changes. Keep canonical ledger and generated plan files under Jarvistark's control.

For a compiled handoff, compare its task revision and context fingerprint against `prompt TASK_ID --format json` before editing. Read the recorded repository context and verify prerequisite observations in the actual environment. The compiler selects repair and resume instructions from the current attempt. A missing execution contract can be enriched through the [prompt skill](../jarvistark-prompts/SKILL.md) and task review.
