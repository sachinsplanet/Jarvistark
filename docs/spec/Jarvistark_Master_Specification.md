# Jarvistark

## Master Product Context, Concept, Architecture, Workflow, Technology Stack, Open-Source Plan, and Implementation Roadmap

**Document type:** Master product and engineering specification  
**Product name:** Jarvistark  
**Product category:** AI-assisted software planning, specification, and coding-agent orchestration  
**Intended distribution:** Free and open-source, with local-first use and optional user-configured model integrations  
**Primary implementation strategy:** TypeScript and Node.js in a modular monorepo, with multiple interfaces and language-specific project analyzers  
**Status:** Proposed blueprint. This document describes the intended product; it does not claim that the software has already been implemented.

---

# 1. Executive Summary

Jarvistark is a developer tool that translates a user's rough software idea into a structured, technically informed, implementation-ready project package. It helps users move from a conceptual description to explicit requirements, an application breakdown, architecture, environment and dependency requirements, implementation tasks, acceptance criteria, testing instructions, and coding-agent prompts.

Jarvistark is intended to work alongside the AI coding tools and models people already use. It is not primarily a new foundation model, generic chatbot, token compressor, or autonomous code generator. Its defining purpose is to preserve the user's intent and turn it into a validated plan that supported coding agents can follow.

A user may describe an application in informal language without knowing all of the technical vocabulary. Jarvistark interprets the description, separates facts from assumptions, asks focused clarification questions when important decisions are missing, then produces a coherent engineering blueprint.

The product should be **programming-language-independent**. Python is one example of a language a user's project may use, not a limitation on Jarvistark's implementation or supported project types.

The recommended implementation is a TypeScript/Node.js core shared by a CLI, model adapters, project analyzers, an MCP server, a VS Code extension, and eventually a web application. The initial release should focus on a reliable local core and one practical AI-agent workflow. More interfaces and language analyzers can be added without rewriting the planning engine.

## Core value proposition

> Preserve the user's intent, formalize the requirements, design the system, verify the prerequisites, and then instruct the coding agent to implement it.

## The basic transformation

```text
Rough Human Idea
       |
       v
Input and Context Capture
       |
       v
Intent and Requirement Analysis
       |
       v
Ambiguity, Contradiction, and Assumption Review
       |
       v
Clarification / User Approval
       |
       v
Structured Project Specification
       |
       v
Architecture and Application Decomposition
       |
       v
Environment and Dependency Planning
       |
       v
Implementation Task Graph
       |
       v
Prompt Compilation and Validation
       |
       v
Export / Supported IDE or Agent Integration
       |
       v
Implementation Feedback, Testing, and Controlled Plan Updates
```

---

# 2. Product Concept

## 2.1 The problem Jarvistark solves

AI coding agents can produce code, but users still need to communicate what they intend to build and define the technical context in which the code must work. Rough descriptions commonly omit requirements, relationships, edge cases, constraints, setup instructions, and testable definitions of success.

When a coding agent receives an underspecified concept, it may:

- Misinterpret the user's actual goal or drift into a different product direction.
- Invent requirements or expand the scope without approval.
- Skip clarification of consequential decisions.
- Produce a large, tangled implementation instead of manageable tasks.
- Choose an unsuitable architecture or incompatible dependencies.
- Omit pages, API contracts, database relationships, permissions, or error states.
- Assume tools or runtimes are installed when they are not.
- Produce vague prompts without objective acceptance criteria.
- Generate inconsistent instructions across different coding sessions or agents.
- Claim success without running the relevant checks.

Jarvistark addresses these risks by creating and maintaining an explicit, versioned project specification and deriving downstream instructions from it.

## 2.2 Product vision

Make software planning more systematic and accessible to beginners, students, solo developers, founders, and engineering teams. Users should be able to describe the problem in ordinary language without first knowing every technology or engineering term.

Jarvistark should help answer:

1. What is the user actually trying to build?
2. What has the user explicitly required?
3. What is inferred, recommended, or still unknown?
4. What pages, features, workflows, services, APIs, and data models are needed?
5. Which architecture and technologies fit the requirements and constraints?
6. What must be installed or configured to build and run the project?
7. In what order should implementation tasks be completed?
8. What prompts should be given to a coding agent for each task?
9. How can the system check that the specification is coherent and complete?
10. How can implementation feedback update the plan without changing the user's intent silently?

## 2.3 Core principles

### Preserve intent
The original user description must remain available as an immutable source record. Jarvistark must not silently replace the user's product idea with an alternative concept.

### Separate facts from assumptions
User-stated facts, inferred requirements, recommendations, assumptions, and unresolved questions must be visibly distinct.

### Structure before implementation
The workflow should establish enough requirements and architecture before producing extensive coding prompts.

### Provider independence
The planning core must not depend on one LLM provider, model family, IDE, or agent runtime.

### Project-language independence
Jarvistark may be implemented in TypeScript while analyzing projects written in Python, JavaScript, Java, Rust, C#, Go, Swift, SQL, and many other languages.

### Evidence-aware technical guidance
Version and dependency recommendations should rely on manifests, official documentation, package metadata, compatibility rules, or verified tool output when possible. Unverified claims must be labeled.

### Practical outputs
Generated documents must support real implementation tasks. More prose is not automatically better.

### Human control
Material changes to scope, architecture, permissions, file contents, or operating-system state must be reviewable and require appropriate authorization.

### Honest verification
Jarvistark must not claim that code was built, tests passed, dependencies were installed, or integrations work unless the relevant operations were actually performed and verified.

---

# 3. What Jarvistark Is and Is Not

## Jarvistark is

- An idea-to-specification transformation system.
- A requirements and assumption management engine.
- A technical architecture planning system.
- A page-by-page, workflow-by-workflow, and component-by-component decomposition tool.
- An environment and dependency planning system.
- An implementation task planner.
- A coding-prompt compiler.
- A consistency and completeness validator.
- A provider-independent core that can be exposed through supported developer tools.
- A possible future feedback layer that tracks implementation progress and test results.

## Jarvistark is not primarily

- A new general-purpose foundation model.
- A generic chatbot with no persistent structured project state.
- A token-compression tool.
- A code simplification plugin.
- An all-in-one autonomous software builder in its first release.
- A universal IDE session interceptor.
- A guarantee of bug-free software.
- A file converter whose main purpose is converting CAD files or other documents.
- A replacement for every LLM provider or coding agent.

Jarvistark can later analyze existing project files, repositories, screenshots, and design references where supported. Those are input capabilities that support the same core purpose: creating a coherent, implementation-ready software plan.

---

# 4. Users and Use Cases

## Target users

**Beginner developers:** Need help turning ideas into technical plans without already knowing every engineering term.

**Students:** Need structured plans for academic projects, portfolios, prototypes, and practical learning.

**Solo developers and indie hackers:** Want to define a minimum viable product, maintain scope, and organize work across coding sessions.

**Founders and product teams:** Need explicit features, workflows, technical trade-offs, and requirements traceability.

**AI-first developers:** Want consistent prompts and shared project context across supported coding agents.

**Engineering teams:** Want to standardize technical specifications, environment setup, acceptance criteria, and handoffs.

## Example use case

A user says:

> I want a college attendance application. Teachers should mark attendance, class teachers should manage their classes, and parents should automatically receive attendance notifications.

Jarvistark should discover and structure at least the following areas:

- User types and permission boundaries.
- Student, teacher, class, subject, and attendance relationships.
- Teacher authentication and authorization.
- Class-teacher versus subject-teacher responsibilities.
- Attendance creation, editing, locking, and history rules.
- Parent/guardian relationships and notification preferences.
- Notification triggers, delivery methods, retry rules, and failure visibility.
- Teacher, class-teacher, and administrator pages.
- Database schema and API contracts.
- Privacy, audit history, validation, and access-control requirements.
- Development environment and deployment prerequisites.
- Implementation tasks, test cases, and acceptance criteria.

It should ask about important undefined behavior, such as the desired notification channel, rather than quietly choosing it as a confirmed requirement.

---

# 5. Core Modules and Responsibilities

## 5.1 Project intake interface

Captures the user's rough idea and any optional constraints or supporting material.

Potential inputs:

- Free-form natural language.
- Feature lists and requirements documents.
- Screenshots and design references, where supported.
- Existing code and configuration files from an authorized workspace.
- Existing repository metadata.
- Preferred languages, frameworks, deployment targets, or budget limits.
- Operating system and available development environment, when relevant.

The original input must be retained separately from normalized interpretation. Project-file access must be explicit and scoped.

## 5.2 Intent analysis engine

Extracts the product purpose, users, goals, features, constraints, workflows, and expected results. It identifies contradictions and distinguishes explicit statements from inference.

Classify findings as:

1. Explicit user requirement.
2. Inferred requirement.
3. Recommendation.
4. Assumption.
5. Unresolved question.
6. Observed repository fact, where repository analysis is enabled.

## 5.3 Clarification engine

Determines whether missing information materially affects architecture, scope, cost, privacy, security, or functionality.

Ask focused questions for important decisions. Minor uncertainties may be recorded as clearly labeled assumptions for review. Avoid an endless questionnaire.

## 5.4 Technical translation engine

Converts informal descriptions into precise engineering language while preserving their meaning.

Examples:

| Informal description | Technical interpretation |
|---|---|
| People should sign in | Authentication workflow |
| Teachers can only see their own classes | Authorization and resource-level access control |
| Save attendance history | Persistent storage, data model, and retrieval behavior |
| Notify parents automatically | Event-triggered notification workflow |
| Work on phones | Defined responsive-web or mobile-application requirements |
| Show the latest records | Defined data retrieval, sorting, and freshness behavior |

## 5.5 Requirements and scope manager

Creates functional requirements, non-functional requirements, user roles, permissions, business rules, user stories, acceptance criteria, constraints, and explicit out-of-scope items.

Every requirement must have a stable ID such as `REQ-001`.

## 5.6 Application decomposition engine

Breaks projects into the elements relevant to their type.

For web and mobile applications, this may include pages, screens, navigation, reusable components, forms, table states, loading states, empty states, error states, responsive behavior, and user journeys.

For APIs, automation, data science, desktop applications, and infrastructure projects, decomposition should use suitable concepts such as endpoints, services, stages, modules, jobs, data contracts, build targets, and deployment units.

## 5.7 Architecture planner

Proposes system components and their interfaces based on approved requirements. It may plan frontend, backend, database, authentication, APIs, background jobs, external services, logging, testing, and deployment.

Important choices should include rationale, relevant alternatives, trade-offs, dependencies, and the requirements they satisfy. Avoid unnecessary microservices and infrastructure.

## 5.8 Environment and dependency planner

Produces project-specific development and runtime requirements, including:

- Operating system compatibility.
- Language runtime and supported version ranges.
- Framework and package manager.
- System libraries and build tools.
- Database engine or managed service.
- IDE or command-line tools.
- API credentials and environment variables.
- Test runners and linters.
- External APIs and services.
- Deployment platform requirements.

For each item, record its purpose, necessity, version constraint, platform notes, installation method, configuration, verification command, expected result, and evidence/source where available.

Distinguish installed local software from remote services. SQL is a language, not a single database to install; the actual engine and tooling must be specified. Do not recommend the newest version blindly. Respect framework and dependency compatibility.

## 5.9 Implementation planner

Converts the approved specification and architecture into tasks with IDs, prerequisites, dependencies, scope, expected outputs, acceptance criteria, tests, and completion conditions.

Represent task dependencies as a directed acyclic graph where possible. Detect cycles and tasks whose prerequisites remain unresolved.

## 5.10 Prompt compiler

Generates project-level, phase-level, task-level, review, testing, and repair prompts. Each prompt includes only the context required for its task while referencing the canonical project requirements.

## 5.11 Consistency validator

Checks structural and semantic completeness across specifications, architecture, environment instructions, tasks, prompts, and tests.

Examples:

- Every must-have requirement maps to implementation tasks.
- Each protected operation has authorization requirements.
- Each major page/workflow has supporting requirements.
- API contracts agree with data models.
- Task references and prerequisite IDs exist.
- Task dependencies are acyclic.
- Version and environment constraints are internally consistent.
- Important requirements have acceptance criteria and verification steps.
- The project has not silently expanded beyond the approved scope.

Use deterministic code and schema validation wherever possible. LLM review can supplement deterministic checks but must not be the only validation mechanism.

## 5.12 Export and integration layer

Exports validated project packages and exposes supported functionality to developer tools. Potential interfaces include CLI, MCP, IDE extensions, agent plugins, supported APIs, and a future web application.

The same core schema and planning engine must serve all interfaces.

## 5.13 Project history and change impact

Store specification versions, decisions, approved assumptions, prompts, task states, and changes. When a requirement changes, identify impacted pages, components, interfaces, tasks, documents, and tests. Ask for approval before implementing material changes.

---

# 6. End-to-End Workflow and Processing Pipeline

## Stage 1: Intake

- Create a project record.
- Save the original idea and stated constraints.
- Record selected target environment and optional uploaded context.
- Identify whether the user is planning a new project or analyzing an existing one.

## Stage 2: Intent extraction

- Identify the goal, users, features, user roles, and constraints.
- Extract explicit requirements.
- Label inferences and uncertainties.
- Preserve references to original input where practical.

## Stage 3: Gap and contradiction analysis

- Detect undefined behavior.
- Find contradictory requirements.
- Identify architecture-critical unknowns.
- Rank questions by their potential effect on the project.

## Stage 4: Clarification and approval

- Ask focused questions when needed.
- Store answers as project decisions.
- Mark assumptions as proposed, accepted, rejected, or superseded.
- Do not pretend a proposed assumption is a user-confirmed fact.

## Stage 5: Requirements specification

Generate an editable, structured specification containing objectives, scope, requirements, constraints, roles, workflows, and acceptance criteria.

## Stage 6: Product and system decomposition

Generate pages and UI components where relevant, user flows, APIs, services, data models, external integrations, and system boundaries.

## Stage 7: Architecture planning

Choose a suitable technology stack and architecture that fit the requirements. Explain material trade-offs and record decision history.

## Stage 8: Environment and dependency analysis

Inspect framework/package metadata and official documentation where practical. Create compatible version constraints, setup instructions, configuration requirements, and verification procedures.

## Stage 9: Task graph generation

Break the project into ordered implementation tasks. Model real parallelism and dependencies rather than forcing every task into a single linear sequence.

## Stage 10: Prompt compilation

Generate a prompt for each approved task, using the current specification, architecture decisions, relevant repository context, scope, exclusions, and acceptance criteria.

## Stage 11: Validation

Check schemas, requirement traceability, dependency relationships, contradictions, task references, environment gaps, and test coverage.

## Stage 12: Review and export

Display the blueprint and unresolved findings. Allow the user to approve, edit, or export validated artifacts.

## Stage 13: Implementation feedback (later phase)

Where supported, ingest implementation status, real test results, build errors, and verified repository changes. Update task status and propose specification changes for approval; do not silently rewrite requirements.

## Pipeline state model

```text
INTAKE
  -> ANALYSIS
  -> CLARIFICATION (when required)
  -> SPECIFICATION
  -> ARCHITECTURE
  -> ENVIRONMENT_PLAN
  -> TASK_PLAN
  -> PROMPT_COMPILATION
  -> VALIDATION
  -> REVIEW
  -> EXPORT
```

The orchestrator should persist intermediate state, support safe retries, and allow resumption after failures. A stage must have explicit input/output schemas, validation rules, and error behavior.

---

# 7. Recommended Technology Stack for Building Jarvistark

This section describes technologies used to implement Jarvistark itself. They are separate from the programming languages and frameworks that Jarvistark will eventually analyze.

## 7.1 Main implementation language and runtime

**Primary language:** TypeScript  
**Runtime:** Node.js using the current supported LTS release at implementation time  
**Package management:** pnpm workspaces  
**Repository structure:** Monorepo  
**Type checking:** TypeScript compiler (`tsc`)

TypeScript is recommended because the core engine, CLI, MCP server, VS Code extension, and Next.js-based web interface can share the same language, schemas, and package ecosystem.

Version policy: check the official Node.js release schedule before selecting the runtime. Prefer a supported LTS version for the public tool; do not pin the entire product to a runtime recommendation in this document if the release status changes.

## 7.2 Core schemas and validation

- **Zod** for runtime schema validation and typed input/output structures.
- **JSON Schema** as a portable schema representation for external tools and model structured-output features.
- Use stable schema versions and migration rules for projects created with earlier releases.
- Validate every LLM-generated object before saving or using it.

The same canonical project specification should be usable by the CLI, MCP server, editor extension, and web app.

## 7.3 LLM integration

Recommended starting approach:

- `ai` (Vercel AI SDK) for a unified TypeScript model interface where supported.
- Provider adapters such as `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, or `@ai-sdk/xai` when supported by the selected SDK version.
- Custom adapter interfaces for providers or local model servers not covered by the chosen library.
- Zod schemas for structured output validation.
- A Jarvistark-owned orchestration layer for state, retries, approvals, budgets, stage ordering, and validation.

Do not let the model SDK own the product's core project state or schema. The SDK is an integration dependency; Jarvistark remains the orchestrator.

Do not assume every provider supports the same structured-output, tool-calling, streaming, or model-selection features. Expose capabilities through adapters and handle missing capabilities gracefully.

## 7.4 Source-code and repository analysis

Potential starting components:

- `fast-glob` for discovering files.
- `ignore` for `.gitignore`-style filtering and excluding irrelevant paths.
- Tree-sitter bindings such as `web-tree-sitter` or an appropriate Node-compatible binding for syntax parsing.
- Language-specific parsers and manifest readers where a native parser is more suitable.
- Custom detectors for framework configuration, lockfiles, package manifests, build files, and repository structure.

Tree-sitter can provide concrete syntax trees across many languages and is designed to remain useful when a file contains syntax errors. It does not replace dependency resolution, build execution, or semantic analysis. Use source parsing alongside manifests and tool output.

Prioritize manifest/configuration analysis and a small number of language adapters before attempting deep parsing of every language.

## 7.5 CLI

- **Package:** Commander or another maintained CLI framework.
- **Interactive prompts:** `@clack/prompts` or equivalent.
- **Terminal formatting:** `picocolors` or equivalent.
- **Output:** Readable terminal status plus machine-readable JSON and Markdown exports.

CLI commands are proposed until implemented; do not publish example commands as working features until they exist and are tested.

Suggested eventual commands:

```bash
jarvistark init
jarvistark analyze idea.md
jarvistark validate ./jarvistark-project
jarvistark export ./jarvistark-project --format markdown
```

## 7.6 MCP server

- TypeScript MCP SDK, using the currently recommended package and API version at implementation time.
- Zod for tool input/output schemas.
- Explicit capability registration and authorization checks.

Expose small, purposeful operations such as reading a project's approved requirements, retrieving the current implementation task, validating a specification, or generating a prompt for a selected task.

MCP is an integration protocol; it does not automatically provide access to any arbitrary IDE's active model session, conversation history, subscription entitlements, or private APIs.

## 7.7 VS Code extension

- TypeScript.
- VS Code Extension API and `@types/vscode`.
- `@vscode/vsce` or current recommended packaging/publishing tooling.
- A thin extension UI that calls the shared core or documented core interfaces.

The extension may provide commands, project review panels, requirement browsing, task selection, prompt export, and integration configuration. Do not duplicate the planning engine inside the extension.

## 7.8 Web application (later phase)

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui and its component primitives, where suitable.
- `lucide-react` for icons.
- React Hook Form with Zod validation for complex forms.
- React state initially; Zustand only when shared client state warrants it.
- Next.js Route Handlers or an explicitly separated API layer.

The hosted web app should use the shared schemas and core services. It should not contain an independent interpretation of the requirements pipeline.

## 7.9 Storage

Initial release:

- Local JSON for canonical project specification and portable interchange.
- Generated Markdown for human-readable documents.
- SQLite if local project indexing, task state, or history becomes necessary.

Later hosted collaboration:

- PostgreSQL.
- Drizzle ORM or an equivalent typed query layer if appropriate.

Do not require a database server in the first release unless actual workflows demand it. Treat structured JSON as canonical data, not each generated Markdown file as a separate truth source.

## 7.10 Testing and quality tools

- Vitest for unit and integration testing.
- Playwright for browser-based end-to-end tests once the web UI exists.
- React Testing Library for web UI behavior.
- Mock Service Worker or equivalent for mocked network interactions.
- TypeScript compiler for type checking.
- Biome or a compatible maintained linter/formatter.
- GitHub Actions for continuous integration.
- Changesets or a documented versioning process for packages.
- Dependabot and CodeQL or equivalent dependency/code scanning tools.

The default test suite must not depend on paid LLM calls or uncontrolled network access. Use fixture responses and provider mocks; keep a separate opt-in evaluation suite for live-model comparisons.

## 7.11 Optional later technologies

Only add these when justified by actual requirements:

- Docker for reproducible external services or integration tests.
- Background job queue for a hosted version with asynchronous workloads.
- PostgreSQL for multi-user hosted storage.
- Authentication service for a hosted account system.
- Object storage for user-provided documents, if cloud file hosting is implemented.
- Observability stack for a real hosted deployment.
- Local model server adapters.

Do not add microservices, Kubernetes, message brokers, or complex distributed infrastructure to the MVP without a demonstrated need.

---

# 8. Programming Languages and Ecosystems Jarvistark Should Understand

Jarvistark's implementation language does not limit what it can analyze. Language support should be modular and evidence-based.

## 8.1 Initial ecosystem coverage

| Ecosystem | Languages | Project metadata and useful signals |
|---|---|---|
| Web | JavaScript, TypeScript, HTML, CSS | `package.json`, lockfiles, framework config, build scripts |
| Python | Python | `pyproject.toml`, `requirements.txt`, lockfiles, virtual environment configuration |
| JVM | Java, Kotlin | Maven `pom.xml`, Gradle files, source/config structure |
| .NET | C#, F#, Visual Basic | `.sln`, `.csproj`, `.fsproj`, SDK target framework |
| Systems | Rust, C, C++ | `Cargo.toml`, `CMakeLists.txt`, Makefiles, compiler flags |
| Backend | Go, Ruby, PHP, Elixir | `go.mod`, `Gemfile`, `composer.json`, `mix.exs` |
| Mobile | Dart, Swift, Kotlin, Java, TypeScript | `pubspec.yaml`, `Package.swift`, Gradle, Expo/native configs |
| Data and analytics | Python, SQL, R, Julia | package manifests, notebooks, database configs, pipeline definitions |
| Desktop | C#, C++, Rust, TypeScript, Swift | platform-specific project files and build configurations |

This table is an intended support direction, not a claim that all ecosystems are fully supported in the first release.

## 8.2 Language support levels

Define explicit support levels:

- **Level 0 — File recognition:** identify common file extensions and manifest types.
- **Level 1 — Metadata detection:** identify declared dependencies, frameworks, scripts, and version constraints.
- **Level 2 — Syntax analysis:** parse supported source files and locate modules, functions, classes, and imports.
- **Level 3 — Cross-file project analysis:** infer useful relationships across files and modules with clearly labeled confidence.
- **Level 4 — Verified tooling integration:** run permitted build, test, type-check, or dependency commands and interpret actual outputs.

Do not claim full language support merely because a manifest detector recognizes a project. Display supported capabilities and known limitations for each ecosystem.

## 8.3 Technical knowledge catalog

Maintain structured catalogs for:

- Languages and runtimes.
- Frameworks and their supported versions.
- Package managers and lockfile types.
- Databases and migration tools.
- Operating-system dependencies.
- Build tools and compilers.
- Test frameworks.
- IDEs and extensions.
- Deployment platforms.
- Official documentation URLs.
- Compatibility constraints.

Catalog entries should have sources, last-verified dates where practical, and confidence/status indicators. Prefer official documentation and package metadata. Do not treat LLM memory as an authoritative source for current versions.

---

# 9. Canonical Project Specification and Data Model

The project specification is the single source of truth. Reports and prompts are derived outputs from this data.

## 9.1 Recommended entity types

- `Project`
- `OriginalInput`
- `Requirement`
- `UserRole`
- `UserFlow`
- `Page`
- `Component`
- `ArchitectureDecision`
- `SystemComponent`
- `DataModel`
- `APIContract`
- `Dependency`
- `EnvironmentRequirement`
- `ImplementationTask`
- `AcceptanceCriterion`
- `TestCase`
- `Assumption`
- `OpenQuestion`
- `ArtifactVersion`
- `ChangeRecord`
- `ValidationFinding`

The MVP may represent several of these as nested objects rather than separate database tables. Keep the schema versioned and relationships explicit.

## 9.2 Example requirement

```json
{
  "id": "REQ-001",
  "title": "Teacher authentication",
  "description": "Teachers must authenticate before accessing attendance features.",
  "category": "functional",
  "priority": "must",
  "source": "user_input",
  "status": "approved",
  "acceptanceCriteria": [
    "Unauthenticated users cannot access protected attendance pages.",
    "An authenticated teacher can access authorized attendance features."
  ]
}
```

The exact final schema must define allowed categories, valid statuses, required fields, identifier rules, relationships, migration rules, and validation behavior. The JSON above is illustrative.

## 9.3 Traceability graph

Every important artifact should be traceable:

```text
Original Input
   -> Requirement
      -> Architecture Decision / Component
         -> Implementation Task
            -> Prompt
            -> Acceptance Criteria
            -> Test Case
```

When a requirement changes, Jarvistark should identify downstream artifacts that may need updating.

---

# 10. Output Artifacts

A complete analysis should produce relevant documents, omitting sections that do not apply to the project.

Suggested output tree:

```text
project-blueprint/
├── 00_PROJECT_BRIEF.md
├── 01_REQUIREMENTS.md
├── 02_USERS_ROLES_AND_PERMISSIONS.md
├── 03_USER_FLOWS.md
├── 04_PAGES_AND_COMPONENTS.md
├── 05_SYSTEM_ARCHITECTURE.md
├── 06_DATA_MODEL.md
├── 07_API_CONTRACTS.md
├── 08_TECH_STACK_AND_DEPENDENCIES.md
├── 09_ENVIRONMENT_SETUP.md
├── 10_IMPLEMENTATION_ROADMAP.md
├── 11_TEST_PLAN.md
├── 12_SECURITY_AND_RELIABILITY.md
├── 13_DEPLOYMENT_GUIDE.md
├── 14_ASSUMPTIONS_AND_OPEN_QUESTIONS.md
├── prompts/
│   ├── 00_PROJECT_SETUP.md
│   ├── 01_FOUNDATION.md
│   ├── 02_FEATURES.md
│   ├── 03_INTEGRATIONS.md
│   ├── 04_TESTING.md
│   └── 05_DEPLOYMENT.md
└── machine-readable/
    └── project-spec.json
```

This is a flexible suggested structure, not a requirement that every project have every file. Add project-specific artifacts when relevant, and omit irrelevant files.

## Prompt structure

Every task prompt should include:

1. Project purpose and scope.
2. Relevant approved requirements and architecture decisions.
3. Current task ID and objective.
4. Existing repository context and interfaces.
5. Preconditions and task dependencies.
6. Required behavior and technical constraints.
7. Explicit exclusions.
8. Acceptance criteria.
9. Required tests and verification commands.
10. Reporting expectations, including changed files, tests actually run, failures, and unresolved decisions.
11. Instructions to request clarification rather than invent a decision that materially changes approved scope.

The goal is not the longest possible prompt. The goal is the right context and constraints for the current implementation task.

---

# 11. Recommended Monorepo Structure

Use one public repository named `jarvistark` and begin with a pnpm monorepo. This allows packages to share schemas and core logic while being independently built and tested.

```text
jarvistark/
├── apps/
│   ├── cli/
│   ├── mcp-server/
│   ├── vscode-extension/
│   └── web/                       # Later
├── packages/
│   ├── core/
│   ├── schemas/
│   ├── llm/
│   ├── pipeline/
│   ├── repository-analyzer/
│   ├── environment-catalog/
│   ├── architecture-planner/
│   ├── prompt-compiler/
│   ├── validator/
│   ├── storage/
│   └── exporters/
├── catalogs/
│   ├── languages/
│   ├── frameworks/
│   ├── package-managers/
│   ├── databases/
│   ├── runtimes/
│   └── deployment-platforms/
├── templates/
├── examples/
├── tests/
├── docs/
├── .github/
│   └── workflows/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── biome.json
├── vitest.config.ts
├── PRODUCT_SPEC.md
├── ROADMAP.md
├── LICENSE
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── SECURITY.md
```

This is the target architecture. Do not create every package as an empty placeholder. Start with the smallest package set that supports a working end-to-end workflow, then split modules when boundaries are useful.

---

# 12. Suggested CLI and Core Interfaces

The following commands are proposed design targets, not existing functionality unless implemented and tested:

```bash
jarvistark init
jarvistark analyze idea.md
jarvistark inspect ./existing-project
jarvistark validate ./jarvistark-project
jarvistark export ./jarvistark-project --format markdown
jarvistark export ./jarvistark-project --format json
```

Potential core operations:

- `createProject(input)`
- `analyzeIntent(projectId)`
- `identifyOpenQuestions(projectId)`
- `approveDecision(projectId, decisionId)`
- `generateSpecification(projectId)`
- `planArchitecture(projectId)`
- `planEnvironment(projectId)`
- `generateTaskGraph(projectId)`
- `compilePrompt(projectId, taskId)`
- `validateProject(projectId)`
- `exportProject(projectId, format)`

Use explicit TypeScript types and schema validation. Avoid coupling these operations to CLI commands or editor events.

---

# 13. How Jarvistark Integrates With Existing AI Coding Tools

Jarvistark should complement coding environments rather than require users to abandon their preferred tools.

## 13.1 Direct provider API

The user supplies their own provider credentials. Jarvistark controls model calls made through the documented API and can format structured requests, enforce stage-specific context, and validate results.

Advantages: predictable integration and control over processing stages.

Constraints: provider usage may cost money; APIs, models, rate limits, structured-output capabilities, and authentication differ.

## 13.2 Native IDE or coding-agent integration

Use an officially supported extension, plugin, command, hook, or agent interface. The host may expose some capabilities such as workspace access, tools, prompts, or task results.

Do not assume that being installed in an IDE gives Jarvistark access to its active model, private conversation history, account subscription quotas, or internal APIs.

## 13.3 MCP

An MCP server may expose carefully scoped planning tools, resources, and prompts to compatible clients. Possible operations include retrieving approved requirements, reading the active task, validating a specification, and compiling a task prompt.

MCP is a standard integration interface. It does not itself supply an LLM or guarantee that every client permits every operation.

## 13.4 Portable file-based use

Export Markdown, JSON, and supported agent instruction files. Users can manually feed them to other coding tools when a direct integration is not available.

This is a valuable fallback and should remain supported even when more automatic integrations are added.

## 13.5 Recommended integration order

1. Core library and local file formats.
2. CLI.
3. One supported agent workflow or direct provider adapter.
4. MCP server or another complementary interface.
5. VS Code extension.
6. Additional coding environments.
7. Hosted web experience.

Choose the first coding environment based on target-user demand and actual integration capabilities. Do not attempt all integrations simultaneously.

---

# 14. Free and Open-Source Distribution Model

## 14.1 Intended model

Jarvistark should be free to download, use, modify, and self-host under a selected open-source license. The repository should accept community contributions through documented pull requests.

**Free software is not the same as free model inference.** The tool can be open source even if users pay a model provider for API requests.

Recommended approach:

- Local-first core engine.
- Bring Your Own Key (BYOK) for direct cloud-model APIs.
- Optional supported host-agent workflow when the environment exposes the required integration.
- Optional local model support for users with compatible hardware.
- No central Jarvistark-hosted model service in the MVP.
- No cloud account system or hosted project storage until there is a demonstrated need.

## 14.2 License selection

Evaluate:

- **MIT:** permissive, concise, widely understood.
- **Apache-2.0:** permissive with explicit patent terms.
- **AGPL-3.0:** stronger source-availability obligations for some network-hosted modified versions; use only if that outcome is intentional.

Apache-2.0 is a reasonable default when broad reuse and explicit patent terms are desired. MIT is reasonable when simplicity is the priority. Review the actual license text and obtain appropriate legal advice if necessary. Include the chosen license file in the repository before public release.

## 14.3 Public repository setup

Prepare:

- `README.md` with purpose, screenshots/example outputs, installation, configuration, limitations, and support links.
- `LICENSE`.
- `CONTRIBUTING.md`.
- `CODE_OF_CONDUCT.md`.
- `SECURITY.md`.
- `SUPPORT.md`.
- `ROADMAP.md`.
- Issue templates and pull-request template.
- Automated test workflows.
- A changelog or release-note process.
- `good first issue` tasks for small contributions.

## 14.4 Contribution workflow

```text
Issue or discussion
       -> Fork repository
       -> Create feature branch
       -> Implement with tests
       -> Open pull request
       -> CI checks
       -> Maintainer review
       -> Revision or merge
       -> Versioned release when appropriate
```

Open source does not mean every change must be accepted. Maintainers should protect security, code quality, compatibility, and the product's core purpose.

## 14.5 Hosting and distribution

- GitHub: source, issue tracking, CI, releases, and collaboration.
- npm: publish stable TypeScript packages and CLI when ready.
- VS Code Marketplace: publish the extension after implementation and testing.
- Static documentation hosting: publish guides and examples.
- Hosted web app: optional later release, with a clearly explained cost and data model.

Avoid relying on free-tier hosting for durable project storage or guaranteed availability without checking its current limits. The local-first core should remain useful even if any hosted demo is unavailable.

---

# 15. Security and Privacy Requirements

Jarvistark may read source code, configuration files, business ideas, and credentials. Security is a core product requirement.

Required safeguards:

- Do not expose provider API keys in browser-side code, source control, generated prompts, exports, or logs.
- Exclude `.env` and known secret files by default.
- Ask permission before reading workspaces or sensitive directories outside the selected project scope.
- Treat imported repository content and documents as untrusted data, not authoritative instructions.
- Ask for confirmation before executing shell commands, installing software, or modifying files.
- Require appropriate confirmation for destructive operations.
- Validate output paths to prevent path traversal or unintended writes.
- Redact credential-like values from logs and error output.
- Disclose which project content is sent to an external model provider.
- Secure provider credentials using appropriate local or server-side methods.
- Provide a way to inspect, export, and delete project state.
- Keep an audit trail for important project and architecture changes.
- Apply least-privilege access to tools and integrations.

For the initial release, avoid central credential management and unnecessary collection of user data. Local-first storage reduces exposure but does not remove the need for careful file and credential handling.

---

# 16. Error Handling and Recovery

Handle at least:

- Provider timeout or unavailable service.
- Rate-limit response.
- Invalid model response or schema mismatch.
- Missing provider credentials.
- Unsupported provider capability.
- Failed file import or unreadable file.
- Dependency or version conflict.
- Missing prerequisite in task graph.
- Circular task dependencies.
- Interrupted analysis.
- Export failure.
- Integration failure.
- Conflicting specification changes.

Persist completed stages so an interrupted project can resume without repeating all previous work. Retries should be bounded and observable. Invalid output must not be silently accepted. Error messages should identify the failed stage, impact, and next safe action.

---

# 17. Development Roadmap

## Phase 0 — Product and architecture definition

Deliverables:

- Finalized product boundaries and MVP scope.
- Versioned project schema design.
- Initial architecture and package boundaries.
- Sample project fixtures with expected results.
- Decision log for unresolved technical choices.

Exit criteria: reviewers agree on what Jarvistark must do, what is out of scope, and how project information will be represented.

## Phase 1 — Core data model and deterministic engine

Build:

- TypeScript monorepo foundation.
- Canonical Zod schemas and JSON Schema export.
- Project storage and serialization.
- IDs and referential-integrity validation.
- Pipeline-state model.
- Markdown/JSON export.
- CLI to initialize, validate, and export specifications.
- Unit tests and documentation.

Exit criteria: a sample specification can be stored, reloaded, validated, and exported in a clean environment without any paid API calls.

## Phase 2 — First AI-enabled analysis pipeline

Build:

- One model adapter.
- Intent extraction.
- Requirement extraction.
- Assumption and open-question models.
- Structured-output validation.
- Error handling and resumable stages.

Exit criteria: representative project ideas produce valid structured requirements, and malformed provider output is safely rejected or retried.

## Phase 3 — Engineering planning

Build:

- Application/page/workflow decomposition.
- Architecture planning.
- Data model and API planning where applicable.
- Environment and dependency planner.
- Implementation task graph.
- Prompt compiler.
- End-to-end consistency validator.

Exit criteria: the system creates a coherent, reviewable blueprint with traceability from explicit requirements to tasks and acceptance criteria.

## Phase 4 — Project and language analysis

Build:

- File discovery and ignore rules.
- Manifest and lockfile detectors.
- Initial language/framework catalogs.
- Repository context ingestion.
- Selected Tree-sitter parsers or language-specific parsing adapters.
- Optional controlled tool-output collection for build/test verification.

Exit criteria: Jarvistark distinguishes detected facts from inferred conclusions and accurately reports its analysis coverage and limitations.

## Phase 5 — First coding-agent integration

Choose one integration based on user demand and available APIs. Implement it as a thin adapter over the shared core. Add an integration test and user documentation.

Exit criteria: a user can invoke Jarvistark in a supported development workflow, review the blueprint, and obtain current task prompts.

## Phase 6 — Open-source public release

Complete:

- License and community health files.
- README, setup docs, troubleshooting, security policy.
- CI workflows and test coverage.
- Release build and package publishing.
- Example projects and sample outputs.
- Known-limitations page.
- Public roadmap and contribution instructions.

Exit criteria: a new contributor can install, test, and use the documented example without direct help from the maintainer.

## Phase 7 — Additional interfaces and ecosystem expansion

Potential additions:

- MCP server if not already released.
- VS Code extension.
- Additional LLM provider adapters.
- Local-model support.
- More language and framework analyzers.
- Web application.
- Team collaboration and hosted project storage.
- Implementation feedback and test-result integration.

Prioritize additions based on observed user needs, not novelty alone.

---

# 18. Testing and Quality Strategy

Jarvistark's greatest risk is producing a detailed but incorrect blueprint. Testing should emphasize intent preservation, requirement coverage, technical consistency, and usefulness to downstream coding agents.

## 18.1 Test corpus

Create realistic example concepts for:

- College attendance application.
- Student learning platform.
- E-commerce store.
- Personal finance tracker.
- REST API.
- Data pipeline or data science project.
- Desktop automation tool.
- Mobile application.
- Role-based application with security constraints.
- Project with contradictory requirements.
- Project with strict language/framework/version constraints.
- Existing repository with incomplete or inconsistent documentation.

For each fixture, record mandatory requirements, acceptable assumptions, important open questions, scope exclusions, and expected task/acceptance criteria relationships.

## 18.2 Key metrics

- Requirement coverage.
- Intent preservation.
- Contradiction-detection rate.
- Assumption transparency.
- Architecture consistency.
- Dependency recommendation accuracy.
- Environment setup success.
- Requirement-to-task traceability.
- Acceptance-criteria coverage.
- Prompt executability.
- Export reliability.
- Integration reliability.
- Rework attributable to planning mistakes.

## 18.3 Test layers

- Unit tests for schemas, IDs, parsers, validators, exporters, and state transitions.
- Integration tests with mocked model responses.
- Regression tests for previous failure cases.
- Security tests for path handling, secrets, untrusted content, and authorization.
- End-to-end tests for CLI and supported interfaces.
- Optional live-model evaluation suite, run deliberately and separately because it can cost money and results may vary.

Do not measure success by the length of the generated documentation. Measure whether the blueprint helps build the intended software more reliably.

---

# 19. MVP Scope and Non-Goals

## Required for the MVP

1. Accept an informal software idea.
2. Preserve the original input.
3. Extract structured requirements and constraints.
4. Distinguish facts, assumptions, recommendations, and questions.
5. Ask for clarification on material unknowns.
6. Generate application decomposition suitable for the project type.
7. Propose architecture and technology decisions.
8. Produce environment and dependency checklists.
9. Generate an ordered implementation task graph.
10. Generate task-specific prompts with acceptance criteria.
11. Validate schemas, references, dependencies, and consistency.
12. Export Markdown and JSON.
13. Provide one documented model or host-agent integration path.
14. Run deterministically with mocked model responses in tests.
15. Be installable and usable locally.

## Explicitly defer unless essential to proving the product

- Fully autonomous end-to-end code writing.
- Automatic dependency installation.
- Automatic deployment.
- Unrestricted shell execution.
- Universal access to arbitrary IDE model sessions.
- Cloud accounts and team workspaces.
- Every programming language and framework at advanced analysis depth.
- Multi-agent orchestration across many vendors.
- A complete public SaaS platform.
- Always-on model proxying or interception of all user prompts.

---

# 20. Definition of Done

The MVP is ready for a meaningful pilot when:

- A user can submit a real, imperfect project idea.
- The original intent remains accessible and traceable throughout the workflow.
- Requirements are editable and have stable IDs.
- Assumptions and open questions are explicit.
- Architecture decisions have reasonable rationale and dependency relationships.
- Environment requirements are project-specific and include verification steps.
- Implementation tasks include prerequisites and acceptance criteria.
- Generated prompts are consistent with the approved specification.
- Markdown/JSON exports can be loaded and validated.
- The core works independently from any single LLM provider or IDE.
- Failures are reported clearly and do not corrupt project data.
- Tests detect known classes of invalid references and contradictions.
- Sensitive project content is handled according to explicit privacy rules.
- Documentation matches implemented behavior.
- A new user can complete a documented example without maintainer intervention.

---

# 21. Master Instructions for Any Coding Agent Building Jarvistark

Treat this document as the product source of truth. Before implementing a task, read the current repository and its existing instructions. Preserve existing work and conventions when appropriate.

## Non-negotiable product rules

1. Do not reinterpret Jarvistark as a different product.
2. Do not change its primary purpose to generic prompt rewriting, token compression, code simplification, autonomous coding, or file conversion.
3. Preserve the distinction between Jarvistark's own implementation stack and the many stacks its project analyzer may support.
4. Keep the canonical project specification programming-language-independent.
5. Keep the core independent of a specific model provider, IDE, or frontend.
6. Do not invent integration capabilities that a target environment does not expose.
7. Treat user statements, inferences, recommendations, assumptions, and observed repository facts separately.
8. Never silently change the user's approved product scope or architecture.
9. Validate structured model outputs before saving or acting on them.
10. Use deterministic checks for schemas, IDs, references, graph cycles, and export integrity wherever possible.
11. Do not claim a dependency is installed merely because a plan mentions it.
12. Do not claim that a command ran or a test passed unless it was actually executed and its result verified.
13. Do not expose secrets in code, prompts, logs, reports, or exports.
14. Do not run commands or modify files outside the authorized workspace.
15. Obtain appropriate approval before destructive operations, dependency installation, or file modification.
16. Avoid unnecessary abstractions, microservices, and dependencies.
17. Build small milestones with explicit acceptance criteria.
18. Update documentation to match actual behavior.
19. Identify material assumptions and unresolved decisions instead of guessing silently.
20. Before expanding scope, explain the reason, alternatives, impact, and tests needed.

## Required task plan before substantial implementation

Before writing substantial code, provide:

- Current repository assessment.
- Proposed files/modules to add or modify.
- Data structures and interfaces involved.
- Acceptance criteria.
- Tests to add or run.
- Dependencies and compatibility concerns.
- Security/privacy implications.
- Unresolved decisions that require approval.

Then implement the smallest coherent milestone, run the relevant tests, and report actual results.

## Required completion report after each task

Report:

- Files created or changed.
- Architectural and schema decisions.
- Commands executed.
- Tests actually run and observed results.
- Known defects or limitations.
- Any unimplemented work.
- Decisions required before the next milestone.

Do not state that the whole product is finished when only a foundation or partial integration is implemented.

---

# 22. Immediate Next Steps

The recommended order is:

1. Finalize this document as the initial product source of truth.
2. Create the public `jarvistark` repository and select a license.
3. Create the pnpm workspace and TypeScript build/test configuration.
4. Implement the canonical schema and deterministic core before model integration.
5. Build a CLI that can initialize, validate, and export a project specification.
6. Add an LLM adapter and one end-to-end intent-to-blueprint workflow.
7. Add architecture, environment, dependency, task, and prompt planning.
8. Build an evaluation corpus and regression tests.
9. Connect one supported coding-agent workflow.
10. Publish a versioned release with examples, documentation, security guidance, and contribution instructions.

The first milestone is complete when another developer can install Jarvistark, provide a sample project specification, validate it, and export the result without needing your manual intervention.

---

# 23. Official Documentation and Reference Links

These links are starting points for checking APIs, supported versions, and implementation practices. Verify current versions and compatibility when implementation begins; library APIs and release status can change.

## Language, runtime, and package management

- TypeScript: <https://www.typescriptlang.org/docs/>
- Node.js releases: <https://nodejs.org/en/about/previous-releases>
- pnpm workspaces: <https://pnpm.io/workspaces>
- npm package publishing: <https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry>

## Schemas and AI

- Zod: <https://zod.dev/>
- Zod JSON Schema: <https://zod.dev/json-schema>
- Vercel AI SDK: <https://ai-sdk.dev/docs/introduction>
- OpenAI API documentation: <https://platform.openai.com/docs/>
- Anthropic API documentation: <https://docs.anthropic.com/>
- Google AI documentation: <https://ai.google.dev/gemini-api/docs>
- xAI API documentation: <https://docs.x.ai/>

## Source analysis and integrations

- Tree-sitter: <https://tree-sitter.github.io/tree-sitter/>
- MCP TypeScript SDK: <https://ts.sdk.modelcontextprotocol.io/v2/>
- VS Code Extension API: <https://code.visualstudio.com/api/>
- Next.js App Router: <https://nextjs.org/docs/app>

## Testing, storage, and release

- Vitest: <https://vitest.dev/>
- Playwright: <https://playwright.dev/docs/intro>
- GitHub Actions: <https://docs.github.com/actions>
- Drizzle ORM: <https://orm.drizzle.team/docs/overview>
- GitHub community health files: <https://docs.github.com/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file>
- Choose an open-source license: <https://choosealicense.com/>
- GitHub Pages: <https://docs.github.com/pages>

---

# 24. Final Product Definition

Jarvistark is a free and open-source, provider-independent AI-assisted software planning and coding-agent orchestration tool. It converts informal ideas into structured requirements, architecture, application decomposition, environment and dependency checklists, implementation tasks, acceptance criteria, and consistent prompts for supported coding agents.

It uses a versioned, validated project specification as the canonical source of truth. Multiple interfaces and providers can use that specification without duplicating the planning logic. Its project analyzers are modular and designed to support many programming languages, frameworks, databases, package managers, and deployment environments over time.

Its differentiator is not generating longer prompts. It is maintaining a traceable, validated representation of what the user intends to build and using that representation to guide implementation without silently changing the assignment.

**Jarvistark's guiding principle: preserve the intent, formalize the requirements, design the system, verify the prerequisites, and then instruct the coding agent to implement it.**
