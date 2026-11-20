# CLI execution and evidence

Use the app workspace with each command and substitute the [verified CLI invocation](../../jarvistark/references/cli.md) for `jarvistark`.

```sh
jarvistark --workspace "/absolute/path/to/app" next
jarvistark --workspace "/absolute/path/to/app" start TSK-001
# Implement the task and its acceptance tests in the app workspace.
jarvistark --workspace "/absolute/path/to/app" check TSK-001
jarvistark --workspace "/absolute/path/to/app" done TSK-001
jarvistark --workspace "/absolute/path/to/app" validate
jarvistark --workspace "/absolute/path/to/app" next
```

Use the task ID returned by `next`. It can return an in-progress attempt to resume or a failed task to retry. Skip `start` when resuming an in-progress attempt. A blocked task is unavailable until Jarvistark's approval, prerequisite, and context checks are satisfied. If a task becomes stale, use the freshly approved definition and start a new attempt when it is eligible.

`check` runs the approved commands with the app workspace as their working directory. It stores the command, check ID, timestamp, executor, exit status, combined output, and runner attestation for the attempt. A nonzero CLI result can be a recorded test failure or an error before execution. Read the output and check `status` to distinguish them. A recorded failure with no output can warrant checking whether the host allowed the process to launch. If the host blocks execution, follow its permission process for the same approved command or report what remains unverified. Avoid swapping commands or marking a task done based on a direct test run.

`done` requires passing runner-verified results for every check on the current attempt. The `evidence` command is for self-reported results and cannot satisfy that requirement. To audit the result, inspect `task.attempts` in `status` or the `check.recorded` and `task.completed` events in `export`. Report the latest attempt and check IDs, and mention a failed earlier attempt when it explains the repair. Keep output excerpts short and omit secrets.

If the specification needs a material change, prepare a scratch claim proposal and submit it through `propose`. Explain the failing check and the change needed. For a check-only correction, give the reviewer an explicit replacement draft for `revise-task` using the [task planning reference](../../jarvistark-task-planning/references/tasks.md). Updating an approved task version clears its approval. Resume only after the human has approved the new inputs and task definition as needed.
