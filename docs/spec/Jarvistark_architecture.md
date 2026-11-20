# Jarvistark architecture

*Draft v0.1, 15 October 2026. A proposed architecture, not implemented software. Built from the architecture section of the 12 October 2026 concept draft. References such as §5.2 point into `Jarvistark_Master_Specification.md`.*

## Scope and premises

This document covers how Jarvistark turns a planner's proposals into an accepted, versioned record of intent, and how tasks and prompts are derived from that record. The product concept, the review of the Master Specification, the repository layout, the build order and the decision records are out of scope.

Jarvistark is a system of record for intent. Planning is the front end, and prompts are one rendering of the record rather than the product. Three premises shape the architecture:

- **Claims, not documents.** Every requirement, assumption, decision and question is a claim with an origin and an acceptance state. The Markdown documents in §10 are views of that ledger.
- **Models propose, people accept, code verifies.** A model never writes to the ledger. It submits a typed proposal that validators check and a person accepts. After acceptance, task ordering, context selection and prompt rendering are deterministic and testable.
- **Readiness, not volume.** Success means “ready to hand to an agent”: no blocking questions, every must-have has a check, every task has accepted inputs. The number of documents generated is not the measure.

The Master Specification's principles (§2.3) stand: preserve intent (the original input stays immutable), separate facts from assumptions, structure before implementation, provider independence, project-language independence, evidence-aware technical guidance, practical outputs, human control and honest verification. What this architecture adds is that each principle is a property of the system, enforced by a mechanism, and not an instruction to a model.

## System overview

Whoever plays the planner, every change crosses validation and a person's approval before it reaches the ledger. Everything downstream is derived from the ledger, and results come back as proposals rather than edits. Ports underneath (storage, project scan, shell runner, model access) keep the core from touching the outside world directly.

&#91;embedded content: system overview · 6 elements, 1 loop, ports underneath\]

In words: Planner, then Validate, then Approve, then Ledger, then Derived, which Consumers pull from and report back to. Results return to Validate as proposals.

| Element | Role | Trust |
| --- | --- | --- |
| Planner | Proposes claims and revisions; a host agent or a model adapter | Untrusted: its output is a proposal |
| Validate | Schema, ID, reference and rule checks; returns machine-readable errors | Deterministic code |
| Approve | A person accepts, rejects or edits; recorded as an event | A person |
| Ledger | Append-only record of claims, links and approvals | Deterministic code |
| Derived | Documents, task graph, context bundles and prompts | Deterministic code |
| Consumers | Coding agents and people who pull tasks and report results | Outside world |
| Ports | Interfaces for storage, scan, runner and model; adapters live outside the core | Outside world |

## The planner is a role, not a component

The planner is whoever proposes changes to the ledger. In a skill-pack or MCP shape, the host agent plays it: it runs the interview and submits proposals, so Jarvistark never has to call a model. In a standalone shape (a CLI with its own key, a web app), a model adapter plays it. Both emit the same typed proposal. Most of §7.3 (provider adapters, structured-output handling) and the provider-key and data-egress rules in §15 are therefore needed only for the second shape.

Protocol direction supports this:

- **Sampling is deprecated.** Sampling, the MCP feature that lets a server borrow the host's model, is deprecated as of the 2026-07-28 protocol revision (SEP-2577). The TypeScript SDK documentation tells server authors to call their model provider's API directly instead. “Borrow the host's model through MCP” is not something to design around.
- **Elicitation survives.** A tool handler returns an `input_required` result with its questions, the client answers, and the call is retried. This works over stateless per-request connections with no session ID. Clarifying questions and approvals can go through the host, but durable state has to live in Jarvistark's own store.
- **Anything echoed back through the client is untrusted.** That includes the SDK's `requestState` and the `inputResponses` a handler receives. The SDK documents integrity-protecting `requestState` (HMAC or AEAD, bound to the principal and an expiry) and validating responses against a schema.
- **The Master Specification's SDK link is current.** The link in §23 still points at the right line: v2 is the stable SDK line implementing the 2026-07-28 revision.

## Six mechanisms

These six mechanisms are what make the principles true. The Master Specification leaves each of them implicit.

### 1. Claims with three axes

§5.2's six classes blend *origin* (user-stated, inferred, observed in the repository) with *kind* (recommendation, assumption, question). Acceptance is handled unevenly: the §9.2 example carries `status: approved`, while Stage 4 uses proposed, accepted, rejected and superseded, and only for assumptions. §9.1 then splits Requirement, Assumption, OpenQuestion and ArchitectureDecision into separate entity types, each free to grow its own vocabulary.

Use one claim type with three fields:

| Axis | Values |
| --- | --- |
| Kind | requirement, constraint, assumption, question, decision |
| Origin | user-stated, inferred, recommended, observed |
| State | proposed, accepted, rejected, superseded |

Two rules make it enforceable:

- A user-stated claim must point to a span of the original input: a text range, or a form field when intake is a guided form.
- A claim becomes accepted only through a recorded approval by a person.

If the approver is a founder rather than an engineer, the text they accept should be plain language, with the technical phrasing derived from it and flagged stale if it changes. Prompt compilation reads accepted claims only, with assumptions shown as assumptions.

### 2. Proposals, not writes

A planner returns a typed patch (add, revise, retire, link) using provisional keys. The engine validates it, mints the real IDs (never reused) and appends an event. A bad patch is rejected with machine-readable errors that the planner can repair within a retry budget.

Models never mint IDs and never edit an accepted claim in place. A revision is a new proposed claim that supersedes the old one only when accepted. That makes §21's rule against silently changing approved scope or architecture a property of the system instead of a request to the model. If providers are called directly, send simplified generation schemas, since structured-output modes typically accept only a subset of JSON Schema, and run the full canonical checks afterwards.

### 3. A build graph, not a linear pipeline

The §6 state model is a straight line from INTAKE to EXPORT, with one optional clarification step, no edges back, and no state for Stage 13's feedback. Instead, every derived artifact records the hashes of the claims it was built from.

- When a claim changes, everything downstream is marked stale. That gives §5.13's change impact for free.
- The scheduler recomputes only what is stale. That gives resumability for free.
- The project's phase becomes a function of artifact states instead of a stored enum.
- Model-backed stages re-run as new proposals and never overwrite accepted output.
- Approval checkpoints go after the planned app's specification and after its architecture, so nobody faces fifteen documents at the final review.

### 4. Profiles instead of web-app assumptions

§9.1 puts web vocabulary (Page, UserFlow, Component) into the core entity list, while §2.3 promises independence from the project's language and §5.6 itself says pages and screens apply “for web and mobile applications”. Keep the core generic (claim, component, interface, data entity, task, check) and let a profile supply the intake questions, decomposition checklist, environment defaults and validator rules. “Every protected operation has an authorization requirement” only makes sense in profiles with accounts.

A profile also declares its support boundary, so intake can decline an out-of-scope idea explicitly instead of producing a plausible-looking plan. The Master Specification's college attendance app (§4) needs multiple roles and notifications, so it becomes a useful negative test for an accounts-and-database profile. Profiles are mostly data, which makes them the easiest thing for contributors to add and the natural home for reusable templates that improve across projects.

### 5. Pull, with evidence

Exported prompt files remain the portable fallback, but the stronger design is that the agent pulls. It asks for the next ready task and receives only the claims, decisions and interfaces linked to it, chosen by a deterministic graph walk with a size budget rather than by a model's guess. It then reports back with evidence.

Acceptance criteria are structured checks (command, expected result, status). A result can be recorded only with who ran it and what it printed, and self-reported results are labeled as such. That turns §21's rule about never claiming a test passed into a schema rule. An orchestrator that runs a subagent per task and pauses at milestones is just another consumer of the same loop, and agents file change requests as proposals rather than editing the project's specification.

### 6. Enforcement outside the model

Instructions are advisory; checks are the enforcement. Böckeler's hands-on write-up of Spec Kit and Kiro found that, even with files, templates, prompts, workflows and checklists, the agent frequently did not follow all the instructions. Two consequences follow in agent-hosted shapes:

- The approve step must be something the model cannot do for itself: an MCP elicitation that the host puts in front of the person, or a command the host will not run without the person's permission (so it must not be allow-listed).
- Canonical files are writable only through Jarvistark's own command. `validate` flags out-of-band edits by content hash, and where the host supports hooks or permission rules, direct writes to those files are denied.

Hardening is a speed bump, not the lock. Claude Code's deny rules (for example `Edit(./.jarvistark/ledger/**)` in `.claude/settings.json`) cover its built-in file tools and the file commands it recognizes in Bash (such as `sed`, `tee` and `>` redirections), but not a script that opens the file itself. Enabling the sandbox is the OS-level option. A PreToolUse hook can also block a write (exit code 2, or a deny decision), but a hook that errors can let the action through unless it is set to block on failure. The content-hash check in `validate`, run by CI on every pull request, is what enforces.

Keep any generated AGENTS.md short and mostly a pointer, since it is loaded into every session. AGENTS.md is an open standard stewarded by the Linux Foundation's Agentic AI Foundation, with a list of 20-plus supporting coding agents. Claude Code reads CLAUDE.md, and reads AGENTS.md only where there is no CLAUDE.md, so a one-line CLAUDE.md that imports it (`@AGENTS.md`) covers both.

## One change, end to end

1. The person describes the idea. The original input is stored unchanged and hashed.
2. The planner reads it and returns a proposal: new claims with provisional keys, each user-stated claim pointing at a span of the input.
3. The engine validates the proposal and returns errors for the planner to repair if needed. It then mints IDs and appends an event.
4. The person reviews the claims in plain language and accepts, rejects or edits them. Acceptance is recorded as an approval event.
5. Derived artifacts that depend on the accepted claims are rebuilt. Anything built from claims that later changed is marked stale.
6. An agent asks for the next ready task. The engine walks the graph to the claims, decisions and interfaces linked to that task, within a size budget, and renders the prompt.
7. The agent does the work and reports each check with its command and output. Results are recorded as evidence and labeled self-reported or runner-verified.
8. If the work shows the project's specification is wrong, the agent files a change request as a proposal. A revision supersedes the old claim only when accepted, and downstream artifacts are marked stale.

## What the system guarantees

The architecture turns rules that the Master Specification states as instructions (§21) into properties the system enforces. These invariants are checked by tests and validators. Working agreements, such as plan first and write a completion report, belong in a short AGENTS.md instead.

- **Input and identity.** The original input is stored unchanged and hashed. IDs are minted only by the engine, are unique and are never reused.
- **Acceptance.** Every user-stated claim points to a span of the original input. A claim becomes accepted only through a recorded approval by a person. An accepted claim is never edited in place; a revision supersedes it only when accepted.
- **Ledger.** Events are append-only and hash-chained, so an out-of-band edit breaks the chain.
- **Derivation.** Derived artifacts record the hashes of their input claims, and anything built from a changed claim is marked stale. Prompts are compiled from accepted claims only, with assumptions shown as assumptions. The task graph is acyclic, and exports contain no secrets.
- **Evidence.** A check result is recorded only with who ran it and what it printed, and self-reported results are labeled as such.
- **Boundaries.** Canonical files are written only through Jarvistark's own command, and edits made any other way are flagged by content hash. Writes are confined to the workspace. The core has no file, network or model access and reaches the outside world only through ports; an import-boundary test fails CI if it does not.

## Assumptions and open decisions

The architecture is shell-agnostic. Whether Jarvistark ships as a standalone platform (CLI, MCP server, VS Code extension, web app, provider adapters) or as a skill pack inside the coding agent decides which shells get built, not the core. In the same way, the three orchestration levels are all consumers of one ledger: handoff only (Jarvistark exports prompts), a guided loop (the agent pulls tasks and reports evidence) and an orchestrated run (a subagent per task, with gates at milestones).

Three decisions remain open and should each become a short decision record. The defaults below are proposals, not settled.

- **D1. Shape.** A standalone platform, as the Master Specification is written (bring-your-own-key, one model adapter per provider), or a skill pack inside the coding agent, where the agent plays the planner and there is no server. The standalone platform needs the provider-key and data-egress machinery (§7.3, §15). The skill pack needs no model calls, but approval enforcement depends on what each host supports (hooks, permission rules, elicitation), with the CI hash check as the backstop. Proposed default: the skill pack first, on a shell-agnostic core, so the standalone platform stays possible.
- **D2. Orchestration level.** Handoff only, guided loop or orchestrated. Proposed default: build the guided loop first, because it is the substrate an orchestrator would use, then add the orchestrator as another consumer.
- **D3. Canonical format.** JSON and NDJSON canonical (as §7.9), with generated Markdown that is read-only, carries a content-hash header and is flagged by `validate` if hand-edited; or Markdown as the editable source, parsed into the ledger. Proposed default: JSON canonical, Markdown generated, with round-trip import (edited Markdown becoming proposals) deferred. This document assumes that default, because making Markdown the editable source brings back the review burden of free-text specifications and makes out-of-band edits the normal path.

## Appendix A: illustrative shapes

These shapes illustrate the mechanisms and are not final schemas. As §9.2 says of its own example, the final schema must define allowed values, required fields, identifier rules, relationships, migration rules and validation behavior.

### A.1 A claim

The plain-language `text` is what the person accepted. The technical phrasing is derived from it and goes stale if the text changes. This claim is shown before the change in A.2 and A.3.

```json
{
  "id": "CLM-007",
  "kind": "requirement",
  "origin": "user-stated",
  "state": "accepted",
  "text": "Founders can sign in with email or with a Google account.",
  "source": { "input": "input/original.md", "start": 412, "end": 463 },
  "approval": "EVT-031",
  "supersedes": null,
  "derived": {
    "technical": "Support email/password and Google OAuth sign-in.",
    "fromTextHash": "sha256:3b1e…"
  }
}
```

### A.2 A proposal and the engine's answer

The planner uses provisional keys (`$a`, `$b`). A revision of an accepted claim is a new proposed claim.

```json
{
  "id": "PRP-014",
  "planner": { "role": "host-agent" },
  "ops": [
    { "op": "add", "key": "$a",
      "claim": { "kind": "assumption", "origin": "inferred",
                 "text": "Uploaded files are limited to images and PDFs." } },
    { "op": "revise", "key": "$b", "target": "CLM-007",
      "claim": { "text": "Founders can sign in with email, or with a Google account." } },
    { "op": "link", "from": "$a", "to": "CLM-012", "rel": "constrains" }
  ]
}
```

If the proposal is valid, the engine mints IDs and records an event:

```json
{ "ok": true, "minted": { "$a": "CLM-021", "$b": "CLM-022" }, "event": "EVT-044" }
```

If it is not, the planner gets machine-readable errors it can repair:

```json
{ "ok": false, "errors": [ { "path": "ops[0].claim", "code": "SOURCE_REQUIRED", "message": "A user-stated claim needs a source span." } ] }
```

### A.3 Ledger events

One JSON object per line, hash-chained so that an out-of-band edit breaks the chain.

```json
{"id":"EVT-044","type":"proposal.recorded","proposal":"PRP-014","prev":"sha256:9f2c…","hash":"sha256:41ab…"}
{"id":"EVT-045","type":"approval.recorded","claims":["CLM-021","CLM-022"],"by":"person","prev":"sha256:41ab…","hash":"sha256:c07e…"}
{"id":"EVT-046","type":"claim.superseded","claim":"CLM-007","by":"CLM-022","prev":"sha256:c07e…","hash":"sha256:7d13…"}
```

### A.4 A task with a check and its evidence

The engine builds the agent's context by walking from `needs` to the linked claims, decisions and interfaces.

```json
{
  "id": "TSK-009",
  "title": "Email and Google sign-in",
  "needs": ["CLM-007"],
  "dependsOn": ["TSK-004"],
  "checks": [
    {
      "id": "CHK-009-1",
      "command": "pnpm test auth",
      "expect": "exit code 0",
      "result": {
        "status": "passed",
        "attestation": "self-reported",
        "evidence": "evidence/TSK-009/CHK-009-1.txt",
        "at": "2026-10-12T09:14:03Z"
      }
    }
  ]
}
```

### A.5 A profile

```json
{
  "id": "accounts-database",
  "version": "0.1.0",
  "supports": ["email login", "social login", "file and image uploads"],
  "declines": [
    "payments",
    "multiple user roles",
    "third-party API integrations",
    "real-time features and notifications"
  ],
  "intake": "intake.json"
}
```

## Appendix B: glossary

| Term | Meaning |
| --- | --- |
| Claim | One requirement, constraint, assumption, question or decision, with a kind, an origin and a state |
| Proposal | A typed patch (add, revise, retire, link) that a planner submits; never a direct write |
| Ledger | The append-only record of proposals, approvals and supersessions; the system of record |
| Derived artifact | Anything built from accepted claims (documents, task graph, context bundles, prompts); records the hashes of its inputs |
| Stale | A derived artifact whose input claims have changed since it was built |
| Planner | The role that proposes claims: a host agent or a model adapter |
| Profile | Data that tailors the generic core to a class of projects: intake questions, decomposition checklist, environment defaults, validator rules and a support boundary |
| Port | An interface the core depends on (storage, scan, runner, model), implemented by adapters outside the core |
| Check | A structured acceptance criterion (command and expected result) whose result is recorded with evidence |
| Evidence | Who ran a check and what it printed; self-reported results are labeled |
| Host agent | The coding agent (for example Claude Code or Codex) inside which a skill pack runs |

## Sources

- `Jarvistark_Master_Specification.md`: all § references.
- Birgitta Böckeler, [Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- MCP TypeScript SDK: [v2](https://ts.sdk.modelcontextprotocol.io/v2/), [sampling (deprecated)](https://ts.sdk.modelcontextprotocol.io/v2/servers/sampling.html), [input required](https://ts.sdk.modelcontextprotocol.io/v2/servers/input-required.html), [supporting protocol revision 2026-07-28](https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28.html)
- AGENTS.md: [Meta developer docs](https://wearables.developer.meta.com/docs/ai-assisted-agents-md/), [Claude Code now accepts AGENTS.md (InfoWorld)](https://infoworld.com/article/4224410/claude-code-now-also-accepts-instructions-in-openais-agents-md-format.html)
- Claude Code docs: [permissions](https://code.claude.com/docs/en/permissions), [hooks](https://code.claude.com/docs/en/hooks), [memory](https://code.claude.com/docs/en/memory)
