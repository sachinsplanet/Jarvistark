# Proposed Jarvistark agent and skill plan

Proposed for review on 2026-11-17. This plan translates the product direction into an initial agent roster, skill catalog, user workflow, and implementation sequence.

Jarvistark should let someone describe a website or app in ordinary language, review what will be built, and have a connected coding agent build it from a complete executable plan. Jarvistark owns the translation into requirements, design, setup, tasks, prompts, and verification. The user supplies product decisions and account connections through the guided experience.

The recommended initial design has **three agent roles and eight workflow skills**, reached through the existing **`jarvistark` entry skill**. This produces nine skill folders in the plugin. The three roles are one lead planner and two workers, a builder and a verifier. Run them on demand, with sequential execution as the initial default.

An agent owns a responsibility and can use several skills. A skill defines how to perform a bounded job, which inputs it requires, and what it returns. A model supplies reasoning for an agent. Tools execute operations such as reading a repository, installing packages, running checks, or deploying an app.

Keeping orchestration small follows published guidance to expand agent systems when task complexity warrants it. The specific three-role, eight-skill division below is a proposal for Jarvistark. [OpenAI agent guide](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/), [Anthropic workflow patterns](https://www.anthropic.com/research/building-effective-agents)

| Agent role | Responsibility | Skills it uses |
| --- | --- | --- |
| **Planner and coordinator** | Own the conversation, resolve ambiguity, propose the product and technical plan, prepare execution prompts, dispatch ready work, and explain progress or decisions needed. | Intake, environment discovery, architecture, task planning, prompt compilation. |
| **Builder** | Implement approved work in the app workspace, apply setup actions, diagnose failures, and prepare the runnable or deployed app. | Environment setup, implementation, delivery. |
| **Verifier** | Check the plan for missing coverage, inspect implementation against approved behavior, execute meaningful checks, and report evidence and defects. | Verification, with access to the approved plan and the relevant skill outputs. |

Architecture, dependency analysis, and prompt enhancement each receive a dedicated skill and output contract within these roles. For example, the planner loads the architecture skill when designing the app, then the prompt skill when preparing instructions for the builder. The coordinator launches worker sessions with the current task context and receives their results. The initial delegation depth is one level. Later concurrency can reuse these roles for independent tasks when workspace ownership and merge handling support it.

| Workflow skill | Job and required inputs | Output and completion condition | Relationship to current implementation |
| --- | --- | --- | --- |
| **1. Intake and requirements** `jarvistark-intake` | Understand the original idea, existing answers, users, main journeys, business rules, desired appearance, budget, and delivery target. Ask focused questions in the user's language. | Source-linked requirements, explicit assumptions and unanswered questions, and a readable scope review. The selected scope is ready when consequential questions are answered and the user accepts it. | Extend the existing intake skill with broader project intake and review inside Jarvistark. |
| **2. Environment and dependencies** `jarvistark-environment` | Inspect the selected workspace and execution target. Identify installed, missing, incompatible, and unverified prerequisites. Revisit the findings after architecture selects the stack. | A checked inventory and setup actions with reasons, commands, working directories, configuration names, and verification steps. During an authorized build, apply those actions and verify the result. | Extend the existing inspection skill with setup execution and target capability checks. |
| **3. Product design and architecture** `jarvistark-architecture` | Use requirements and environment findings to design the user experience, technology stack, data, interfaces, permissions, and application structure. | Reviewed user flows, screen and component structure, visual direction, responsive and accessibility behavior, loading/empty/error states, data model, API contracts, and runtime topology. Every material decision links to the requirement it serves. | Expand the existing architecture skill to cover the complete user experience and connected system. |
| **4. Task planning** `jarvistark-task-planning` | Turn approved requirements and design into small implementation outcomes, including setup, data migrations, interface integration, and delivery where applicable. | A dependency graph with scope, required inputs, expected artifacts, executable checks, and requirement coverage. Planning finishes when the selected scope has a viable implementation and verification path. | Extend the existing task skill with explicit coverage across the whole app. |
| **5. Prompt enhancement and compilation** `jarvistark-prompts` | Assemble the approved plan, task, relevant repository context, setup state, and host capabilities into instructions a coding agent can act on. Identify missing information and return it to its owning planning stage. | Versioned project, task, verification, repair, resume, and delivery prompts. Each prompt has a concrete outcome, relevant context, commands, expected behavior, and reporting requirements. | Add this skill around an expanded version of the existing core prompt renderer. |
| **6. Implementation and repair** `jarvistark-implementation` | Take a ready task and its compiled prompt. Change the app, write the required tests, run development checks, and fix defects within the approved scope. | Code and test changes, execution results, and an implementation handoff for verification. A material specification mismatch returns to the planner as a proposed change. | Refocus the existing implementation skill on building and repair, with a verifier handoff. |
| **7. Verification** `jarvistark-verification` | Review plan completeness and check built behavior against requirements, design, and acceptance criteria. Verify interfaces and user journeys as well as individual tasks. | Findings tied to requirements or tasks, recorded check evidence, and a readiness result for the current implementation. Defects return to the builder for repair and rechecking. | Extract the existing verification instructions into a dedicated skill and add browser, persistence, integration, and plan coverage checks. |
| **8. Delivery and launch** `jarvistark-delivery` | Use the verified app and selected delivery target to start a usable preview or perform an authorized deployment. Configure runtime services and migrations required by that target. | A working preview or deployment, access details, startup or redeployment instructions, and target-specific smoke-check evidence. | Add this skill, using deployment and service integrations through tools. |

The `jarvistark` entry skill resumes the project, selects the next applicable workflow, and presents progress. Load each skill's detailed resources when its job is needed. Framework instructions, provider examples, authentication, payments, notifications, and domain-specific guidance can live in shared references or project profiles. Add a separate skill only when a responsibility needs its own reusable inputs, outputs, or evaluation.

The intended user journey stays within one Jarvistark experience.

1. **Describe the idea.** The user starts a project or selects an existing workspace and explains the app in their own words.
2. **Answer product questions.** Jarvistark asks questions such as who can edit a record or what should happen when stock runs out. It recommends technical choices from those answers and the inspected environment.
3. **Review the proposed app.** Jarvistark shows the scope, screen flows, important technical decisions, setup needs, and expected delivery target. The user can correct the proposal in ordinary language. Explanations make cost or account requirements visible where they affect the decision.
4. **Approve the build plan.** The review surface records the accepted version and its included requirements, decisions, tasks, and checks. Reviews can happen in stages during exploration and be consolidated when the user is ready to build.
5. **Build.** Jarvistark passes task prompts directly to the connected coding agent, executes setup, follows dependencies, and keeps a visible progress record. Prompt export remains available for users who choose it.
6. **Try the app.** The verifier checks the actual user journeys and the user gets a working preview. Feedback that changes the product creates a proposed plan revision. Defects in already approved behavior go through repair and verification.
7. **Launch when requested.** Jarvistark deploys to the selected connected target, checks the deployed behavior, and records how to access and operate it.

The user should be able to complete this journey through product answers, review actions, connections, and preview feedback. Jarvistark performs the technical commands and prompt handoffs. Provider sign-in or payment authorization can involve a provider-controlled consent screen, with the workflow returning to Jarvistark afterward.

The plugin is the first delivery surface, consistent with the accepted [product shape](decisions/d1-shape.md). A connected host supplies the model and coding tools. A workspace bridge must connect Jarvistark's review surface to the same project engine used by the CLI. Its human review action must identify the exact displayed version, record the person's decision, and reject a decision against a changed version. An ordinary agent tool call cannot establish that a person reviewed the plan. This bridge replaces the terminal detour in the intended product experience.

The prompt compiler is central to the product. Each executable task prompt needs the following information, assembled from current project state.

| Prompt content | What it makes explicit |
| --- | --- |
| Outcome and scope | The behavior to deliver and the boundaries approved for this task. |
| Source and version | Task ID, requirement and decision IDs, current revisions, and the context fingerprint. |
| Execution environment | App workspace, working directories, actual CLI invocation, runtime, selected package manager, and setup status. |
| Relevant design | The screen behavior, data rules, interface contracts, permissions, and error behavior this task must implement. |
| Repository context | Existing code to reuse, relevant paths and interfaces, prerequisite outputs, and expected new artifacts. |
| Acceptance and evidence | Check commands, what they must assert, execution target, and the evidence to return. |
| Failure and resumption | How to report a blocker, repair failed behavior, propose a specification change, and resume the current attempt. |

The prompt skill can identify ambiguity and propose clearer specifications. Canonical approved fields should be assembled and validated in the core, then formatted for the selected host. Changes discovered during prompt preparation return to requirements, architecture, or tasks for review. Repair prompts use the actual failure output and current attempt. Resume prompts use the recorded state. Every form derives from the same approved plan.

A plan is executable when the selected scope has approved requirements and design, every required behavior maps to tasks and checks, prerequisites have an explicit resolution path, and each task has enough context for the builder to act. Setup and service provisioning may themselves be initial tasks. The core determines when their dependent tasks become ready. Missing credentials or unsupported execution capabilities appear as specific dependencies with a next action.

Model choice belongs in configuration. Start with the connected host's configured model, and reuse the same skill definitions across providers. Where a host supports model selection by role, configuration can assign a model to the planner, builder, or verifier. Host adapters describe available capabilities such as tool execution, browser access, structured responses, context capacity, and worker sessions. Prompt rendering can adapt to those capabilities. Select different models after evaluating their results on the same project fixtures and acceptance criteria. [OpenAI model selection guidance](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)

The shared core continues to own accepted claims, decisions, task dependencies, approvals, readiness, attempt history, evidence, and version consistency. Model, filesystem, process, browser, and network operations remain behind adapters outside `packages/core`. Agent handoffs carry the workspace, current versions, task identity, relevant context, and evidence references. Reload these records on resume. This extends the current [guided execution loop](decisions/d2-orchestration.md).

Completion needs evidence from the implementation being delivered. The builder can run checks while developing. The verifier checks the approved behavior in a fresh context and records results through the runner. The core records task completion after the required evidence passes. Bind evidence to the checked source revision or workspace fingerprint as well as the task and specification. App delivery also requires checks across connected components and the chosen runtime target. Preserve failed attempts so repair and resumed execution remain explainable.

The current repository provides a substantial starting point, with these concrete gaps.

| Existing component | Change required for the intended workflow |
| --- | --- |
| Five workflow skills and the entry skill | Expand environment and architecture, introduce prompts and delivery, and split implementation from verification. |
| Core task prompt renderer in `packages/core/src/gate.ts` | Add environment, repository, interface, version, and failure context to the existing approved claims and checks. Derive all prompt forms from the same inputs. |
| Interactive approvals in `apps/cli/src/main.ts` | Add review inside Jarvistark with the same core approval semantics and a reliable human action boundary. |
| Browser prototype and `apps/web/src/services/storage.ts` | Connect the review UI to the selected app's authoritative workspace. The current browser journal uses separate local storage. |
| Prototype planning in `apps/web/src/services/planner.ts` | Replace preset questions and keyword-based feature exclusions with the actual skill workflow and explicit project capabilities. |
| CLI runner and completion checks | Extend evidence to the code version and whole-app journeys, with repair and resume handled by the coordinator. |
| Packaged Codex plugin | Integrate the eight-skill catalog, host execution bridge, preview access, and selected delivery integrations. |

Implement this in four slices, keeping each slice usable through the existing core and plugin.

1. **Complete the plan and prompt contract.** Define the additional design, environment, repository context, and prompt fields. Expand architecture and task coverage, add `jarvistark-prompts`, and extend the existing renderer. Validate that a fresh builder session can implement an approved task using its generated prompt and available tools.
2. **Bring review and execution into the product.** Connect the review surface to the app workspace, record versioned user approvals, and dispatch compiled prompts through the host. Validate that a user can describe an idea, review the plan, and start a build through Jarvistark.
3. **Connect building, independent verification, and recovery.** Split the implementation and verification skills, automate authorized setup, run ready tasks, record source-bound evidence, and resume interrupted work. Validate a real defect, its repair, and a requirement change that invalidates affected work.
4. **Finish preview and delivery.** Add the delivery skill, launch the app in the selected environment, check its complete user journeys, and expose the preview or deployment to the user. Repackage and verify the resulting catalog in a fresh installation.

Use the Community Seed Library as the first complete app exercise. Start with a rough idea and recorded product answers, derive the screen flows and persistence rules, review the generated plan, then let a fresh builder implement it from the compiled prompts. Verify adding seed stock, recording a withdrawal, preventing invalid counts, and preserving data after restart. Exercise the access rules chosen during intake. Include one failure and repair, a resumed session, and a later requirement change. The product-level acceptance condition is a working app preview reached through Jarvistark, with each required workflow tied to recorded evidence.

Also test a simple public website with an idea requiring pages, content, navigation, responsive behavior, and delivery. That exercise checks that the same system adapts its plan to the product. Expand the execution support matrix through additional project fixtures and host adapters. Keep unsupported capabilities visible and preserve the user's requested scope when planning them.

Slices 1 and 2 are implemented. The plugin now compiles the executable plan, opens a workspace-backed human review, and hands a versioned build request to the active Codex session. The next slice connects building, independent verification and recovery. See the [executable plan workflow](executable-plans.md).
