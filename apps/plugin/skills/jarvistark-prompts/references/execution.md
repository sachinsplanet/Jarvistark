# Execution context and compiled prompts

Task drafts accept `title`, `needs`, `dependsOn`, `checks`, and an optional `execution` object. Include `execution` for a complete coding-agent handoff. It is stored, reviewed, hashed, and revised with the task. Existing tasks can continue through the original CLI workflow and appear in `plan` with an execution-context finding until enriched.

| Execution field | Required content |
| --- | --- |
| `outcome` | A nonempty description of the observable result. |
| `scope` | A nonempty array of task boundaries. |
| `design.userFlows` | Relevant screen or user journeys as strings. Use an empty array when inapplicable. |
| `design.interfaces` | Objects with `name` and `contract` describing the precise caller-visible API or component behavior. |
| `design.dataRules` | Data invariants, validation, persistence, and permission behavior relevant to this task. |
| `environment.target` | The local, container, or hosted environment the instructions target. |
| `environment.runtime` | Runtime and compatibility requirements from the approved design. |
| `environment.packageManager` | Optional package manager and lockfile guidance. |
| `environment.prerequisites` | Objects with `name`, `status`, `evidence`, and `verifyCommand`. Status is `installed`, `missing`, `incompatible`, or `unverified`. Missing or incompatible items need `setupCommand` or `setupTask`. A `setupTask` must also appear in the task's `dependsOn`. |
| `repository` | Existing files to read, each with a workspace-relative `path` and a `purpose`. |
| `deliverables` | Expected artifacts, each with a workspace-relative `path` and a `description`. |

Use empty arrays where a design or file category is inapplicable. Paths are inside the selected app workspace. Acceptance commands run from its root, so select a subproject explicitly in the command when needed. Preserve meaningful assertions and make checks fail if the required tests or behavior are absent.

Record relevant approved decision IDs in `needs`. Their accepted derivation and constraint links supply the source requirements to the compiler. The task's design fields contain the implementation detail for those decisions. Material new design choices should go through architecture review before task approval.

Map the environment handoff's target, inventory status, evidence, and verification steps into `environment`. Setup commands are reviewed instructions. The compiler does not execute probes or infer that a tool is installed. The builder checks those observations in its current environment.

`plan` returns approved claims, tasks, coverage, and findings. Exit code 1 means the plan has gaps, such as uncovered requirements, unapproved tasks, unresolved blocking questions, stale inputs, or incomplete execution details. Planned task dependencies are displayed with their current state.

`prompt TASK_ID` emits Markdown. `--format json` returns `schemaVersion`, `kind`, task identity and revision, `contextHash`, `contentHash`, `complete`, `missing`, and `content`. An incomplete handoff exits with code 1. The compiler refuses task execution prompts while their approval, claims, or dependencies block execution. `prompt --mode project` emits the project handoff and its planning findings.

Task prompt modes are `task`, `verification`, `repair`, `resume`, and `delivery`. Omit `--mode` to select from current state. A completed task gets a review of its existing evidence. A new recorded attempt for completed work currently requires a reviewed task revision.

CLI prompts carry the actual executable and absolute workspace path. The printed invocation uses POSIX quoting on Unix and PowerShell quoting on Windows. The compiler preserves approved context and fails when it exceeds its size budget. Evidence excerpts include the full output hash and a truncation flag. Full output remains in the journal export.
