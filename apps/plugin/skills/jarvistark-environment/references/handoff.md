# Architecture handoff

Task planning can carry the selected target, relevant inventory observations, and setup actions into the task's [execution contract](../../jarvistark-prompts/references/execution.md). Convert installation and verification commands to run from the app workspace root. Keep uncertain observations marked `unverified` until checked.

Use a JSON object with `schemaVersion: 1`. A calling skill or planner can read it directly without parsing the prose report. The report describes one project scope, target, and point in time. Keep raw outputs, credentials, and connection strings out of it.

| Field | Meaning |
|---|---|
| `phase` | `discovery` before architecture selection, or `setup` for the selected stack. |
| `scope` | `projectRoot` is the absolute app workspace. `subproject` is its relative package path or `.`. `target` describes the environment inspected and `inspectedAt` is an ISO timestamp. |
| `items` | Runtimes, package managers, packages, system tools, and services. Each has `name`, `kind`, `requiredFor`, `requiredVersion`, `installedVersion`, `status`, and `evidence`. Use null for unspecified or unknown versions. |
| `constraints` | Objects with `text` and `evidence` for repository facts or accepted requirements that affect architecture. Host limitations stay in `items` unless the user confirms they are binding. |
| `installPlan` | Objects with `items` (names addressed), `cwd` (absolute path), `action`, `command`, and `verify`. Use null for commands that are undetermined or need a decision. |
| `openQuestions` | Unverified facts or decisions architecture should resolve, expressed as strings. |

Use item kinds `runtime`, `package-manager`, `package`, `system-tool`, or `service`. Use `requiredFor` to state the use, such as `development`, `test`, or `runtime`. Include file paths or short probe results in `evidence`. The item statuses have different meanings:

- `installed` means the tool, package, or service was verified within scope and no checked requirement was violated.
- `missing` means it was checked and absent in the inspected environment.
- `incompatible` means an available installation violates a confirmed requirement.
- `unverified` means availability or compatibility could not be established.

Example discovery handoff for a project with a locked npm install:

```json
{
  "schemaVersion": 1,
  "phase": "discovery",
  "scope": {
    "projectRoot": "/work/notes",
    "subproject": ".",
    "target": "local development on Linux",
    "inspectedAt": "2026-11-16T10:00:00.000Z"
  },
  "items": [
    {
      "name": "Node.js",
      "kind": "runtime",
      "requiredFor": "development and runtime",
      "requiredVersion": ">=22",
      "installedVersion": "24.22.1",
      "status": "installed",
      "evidence": ["package.json engines.node is >=22", "node --version returned v24.22.1"]
    },
    {
      "name": "vitest",
      "kind": "package",
      "requiredFor": "test",
      "requiredVersion": "2.1.9",
      "installedVersion": null,
      "status": "missing",
      "evidence": ["package.json devDependencies", "npm ls --depth=0 --json reports vitest missing"]
    }
  ],
  "constraints": [
    {"text": "The existing app declares Node.js 22 or newer with an npm lockfile.", "evidence": ["package.json", "package-lock.json"]}
  ],
  "installPlan": [
    {"items": ["vitest"], "cwd": "/work/notes", "action": "Restore the locked dependencies, including dev dependencies", "command": "npm ci --include=dev", "verify": "npm ls vitest --depth=0"}
  ],
  "openQuestions": ["No database or deployment target has been selected."]
}
```

Pass this report to the [architecture skill](../../jarvistark-architecture/SKILL.md) with the app workspace. Architecture uses the scope, constraints, and open questions to narrow its options. A missing tool can affect setup effort without excluding a stack. When proposing a lasting constraint through Jarvistark, cite its checked repository file or user source. Machine inventory is temporary evidence. If architecture adds a dependency or changes the target, pass the accepted decision back to the environment skill for the setup pass.
