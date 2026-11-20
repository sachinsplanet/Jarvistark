---
name: jarvistark-prompts
description: Compile a reviewed Jarvistark plan into project, task, verification, repair, resume, and delivery prompts. Use to prepare a coding-agent handoff or diagnose missing execution context in an existing task plan.
---

Use the invocation supplied by the caller or resolve the [bundled CLI](../jarvistark/references/cli.md). Keep the app workspace explicit. The core compiles prompts from the reviewed ledger and recorded attempts.

1. Run `plan` and inspect coverage and findings. Missing execution details belong in a reviewed task definition using the [execution contract](references/execution.md). Read the accepted requirements, architecture, environment handoff, and relevant repository files to prepare those details. Surface missing product or design decisions through the corresponding planning skill.
2. Submit authorized task changes through `task` or `revise-task`. Present the actual changes for review. After the person records approval, reload `plan`. A task waiting for a prerequisite can belong to a complete plan while its execution prompt remains blocked.
3. Run `prompt --mode project` for the project handoff. Use `next` to select eligible work and `prompt TASK_ID` for its task handoff. The default mode follows the current attempt. Use `--mode verification` for a check-focused handoff or `--mode delivery` for an approved delivery task. Explicit `repair` requires a failed attempt and `resume` requires an in-progress attempt.
4. Check `prompt TASK_ID --format json` for completeness, revision, and context fingerprint. Pass the compiler output intact to the builder with the app workspace. If a prompt exceeds the context budget, reduce the task's scope through review. Large check outputs are excerpted with hashes and remain available in `export`.
5. On resume, reload the plan and regenerate the prompt. Use actual recorded failure output for repair. If the user only asks for prompts, return the generated text or its scratch-file location with any unresolved findings.

Open the [workspace review](../jarvistark/references/cli.md#workspace-review) for changed claims or tasks. The build action dispatches the reviewed prompt to the waiting host.
