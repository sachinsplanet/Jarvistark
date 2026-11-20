# Jarvistark

Jarvistark records approved software intent and derives implementation tasks and coding-agent context from it. The Codex plugin bundles the CLI, the `$jarvistark` entry skill, and workflow skills for planning, prompt compilation, and implementation.

## Use Jarvistark in Codex

Follow the [plugin installation guide](apps/plugin/README.md), then open your app workspace in Codex. Type `$jarvistark` and select **Jarvistark Planning** in the skill picker, or send `$jarvistark:jarvistark` directly. Describe your app idea. The agent interviews you and prepares reviews for requirements, architecture, and tasks. Jarvistark opens your app’s plan in a local browser. Review the claims and checks there. If you ask to build, select **Start next task** and the same Codex session implements the reviewed task and records check evidence.

## Build from source

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm jarvistark --help
corepack pnpm test:ci
corepack pnpm build:plugin
```

Requires Node 22 or later. The plugin build writes an installable marketplace to `dist/jarvistark-codex/`. See [the guided workflow](docs/guided-workflow.md) for CLI commands, approval boundaries, and storage.

## Use a workflow skill directly

Search for the skill name after typing `$` in Codex. To invoke it directly as text, prefix the skill name with `jarvistark:`, as in `$jarvistark:jarvistark-intake`.

To focus on requirements, ask `$jarvistark-intake` to interview you about the app and prepare source-linked claims for review in your browser. After approval, it gives architecture the current approved claims and calls out any unresolved scope. [Intake and requirements skill](apps/plugin/skills/jarvistark-intake/SKILL.md)

For setup guidance in an existing app, ask “Use `$jarvistark-environment` to check what’s installed and what I still need for local development.” The skill inspects the app, gives install and verification commands, and produces a structured handoff for architecture planning. [Environment skill](apps/plugin/skills/jarvistark-environment/SKILL.md)

Once requirements are approved, you can also invoke `$jarvistark-architecture` directly. Give it the app workspace and the environment handoff if you already have one. It submits the stack, data model, and app structure as linked decision claims for review in your browser. [Architecture skill](apps/plugin/skills/jarvistark-architecture/SKILL.md)

With requirements and architecture approved, ask `$jarvistark-task-planning` to propose implementation tasks for the app workspace. You can review their claim coverage, prerequisites, and acceptance checks before approving them in the review window. [Task planning skill](apps/plugin/skills/jarvistark-task-planning/SKILL.md)

With tasks approved, ask `$jarvistark-implementation` to implement and verify the next task. It pulls the task from the CLI, runs the approved checks, and records the evidence. It reports what becomes ready after completion. [Implementation skill](apps/plugin/skills/jarvistark-implementation/SKILL.md)

Use `$jarvistark:jarvistark-prompts` to compile reviewed plans into coding-agent handoffs. The CLI's `plan` command checks requirement coverage and execution context. `prompt TSK-001` prints a prompt with the approved design, environment, repository context, checks, and current attempt. See the [executable plan workflow](docs/executable-plans.md).

The [freelancer tracker fixture](fixtures/freelancer-tracker) verifies approvals, task dependencies, real test failures, repair, restart, and a requirement revision through the CLI. It is an in-memory example library used to test Jarvistark, not a deployed app.

The [accepted decisions](docs/decisions) describe the guided workflow and the division of responsibilities between the host agent and the core.
