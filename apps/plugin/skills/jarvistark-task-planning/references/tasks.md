# Task drafts and review

Use the [verified CLI invocation](../../jarvistark/references/cli.md) in place of `jarvistark`. Read current claims and tasks with `status`. If you need to inspect architecture links, read `links` in the latest event snapshot from `export`.

## Encode a draft

Submit each object using `task /absolute/path/to/task.json`. Use `title`, `needs`, `dependsOn`, `checks`, and `execution`. Read the [execution contract](../../jarvistark-prompts/references/execution.md) to include the outcome, scope, design, environment, repository context, and deliverables. The CLI assigns task IDs, check IDs, revisions, and readiness. Each check has only `command` and `expect`.

```json
{
  "title": "Protect saved entries with account ownership checks",
  "needs": ["CLM-003", "CLM-008"],
  "dependsOn": ["TSK-002"],
  "checks": [
    {
      "command": "node --test test/entry-access.test.mjs",
      "expect": "An owner can read and update their saved entry. Another signed-in account cannot read or change it, and its attempted update leaves the stored entry unchanged."
    }
  ]
}
```

Replace the IDs with real accepted claims and existing prerequisites. Put the relevant requirement and design decision IDs in `needs`. When a task references an accepted design decision, Jarvistark can follow its accepted `derives-from` and `depends-on` links when rendering the task prompt. Check the actual prompt after approval. Use an empty `dependsOn` for a task that needs no other task to finish.

The runner executes each command from the app workspace. For a monorepo, select the subproject explicitly when needed. Use a named test file or a test target that fails if it does not exist. Avoid checks that only print success, use a catch-all target that can pass with no tests, or mask a failing exit code. A test that will be authored as part of the task is a valid acceptance check. It remains pending until the implementation runs it.

The abbreviated draft above illustrates claim links and checks. Add its execution context before submission for a complete handoff. Record required design changes as proposals. Run `plan` to inspect coverage and missing execution details.

## Review, approval, and corrections

Submit prerequisites first and capture each returned ID. Then validate the whole proposed graph. Review coverage against the approved claims and call out validation findings and pending decisions. Present the ID and outcome of each task, which claims it covers, which earlier tasks it depends on, and exactly how completion will be checked.

Open the [workspace review](../../jarvistark/references/cli.md#workspace-review) to show the exact revisions and checks. The reviewer chooses the tasks to approve. `status` separates unapproved drafts from approved tasks waiting on prerequisites. After review, use the [prompt skill](../../jarvistark-prompts/SKILL.md) to compile the project and first eligible task. Pass its output and the explicit workspace to the [implementation skill](../../jarvistark-implementation/SKILL.md) when the user asks to build.

For a requested correction, use `revise-task TSK_ID /absolute/path/to/task.json` with the full replacement definition. It creates a new revision of the same task and clears its approval. An already approved definition is replaced immediately, so describe the impact and wait for the user's request to replace it. Leave tasks the reviewer declines pending and tell them which ones were deferred. The CLI's `reject` command acts on claims.
