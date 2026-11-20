# Architecture proposals and review

Read `status` for accepted claim IDs. For prior proposal IDs and existing links, read `proposals` and `links` from the latest event's `snapshot` in `export`. Use the [verified CLI invocation](../../jarvistark/references/cli.md) in place of `jarvistark`. Do not write in `.jarvistark/` or `docs/plan/`. Pass a scratch JSON file to `propose`.

## Encode the design

Use `kind: "decision"` and `origin: "recommended"` for proposed design choices. Use an unused numeric `PRP-…` ID and a current ISO timestamp. Link **from** each new decision's provisional key **to** the accepted requirement or constraint that drives it. The `derives-from` links let an implementation task receive its decision and the accepted claims behind it. Use real `CLM-…` IDs from the current workspace. The CLI mints the new decision IDs.

Example of one choice in a design:

```json
{
  "id": "PRP-002",
  "planner": { "role": "host-agent", "id": "jarvistark-architecture" },
  "createdAt": "2026-11-16T10:00:00.000Z",
  "ops": [
    {
      "op": "add",
      "key": "$storage",
      "claim": {
        "kind": "decision",
        "origin": "recommended",
        "text": "Storage: use one SQLite database for the local deployment because requests share one app process and data must survive restarts. Apply versioned migrations at startup. Revisit the database choice if separate hosts must write to the same deployment."
      }
    },
    {
      "op": "link",
      "from": "$storage",
      "to": "CLM-004",
      "rel": "derives-from"
    }
  ]
}
```

A dependency between new decisions can use provisional keys on both ends. If a data model requires the storage decision, link from the model to the storage decision with `depends-on`. Only connect current decisions and accepted requirement IDs. Recreate relevant links from the new key when using a `revise` op, because the revised claim gets a new ID.

Include the implementation facts that matter in the decision text. Use separate decisions when the reviewer might accept one and change another. Keep temporary environment inventory in the handoff. A checked repository fact used as a lasting constraint can be cited with an `observation` source containing the relevant file and evidence. Do not promote a suggested dependency, current host install, or unresolved configuration to a user-stated constraint.

## Review and resume

Use the CLI's `minted` mapping to show the exact proposed IDs. For each, summarize the design choice, what it satisfies, trade-offs, and the setup changes it implies. Open the [workspace review](../../jarvistark/references/cli.md#workspace-review) for the user to decide the displayed design claims. The CLI considers claim approval separately from any claim it depends on, so check that the decisions needed for the chosen design have all been accepted before handing it to task planning. If a user accepts part of the design, leave the affected downstream work pending. If a proposed decision changes, submit a revision targeting its ID and have the new ID reviewed. Use `status` to identify current accepted IDs and `validate` to check the result. A task proposal should reference its accepted architecture decision IDs alongside the relevant requirement IDs so its generated prompt includes the design.

## Hand off accepted design

Give the [task planning skill](../../jarvistark-task-planning/SKILL.md) a short record with the app workspace and target, the accepted decision IDs and their driving requirements, any deferred or pending decision, and only the prerequisite changes introduced by architecture. For example:

- Workspace `/work/library`, local development.
- Storage decision `CLM-008` is accepted and derives from the durable history requirement `CLM-004`.
- Setup needs a writable data directory. Verify it with the selected runtime before starting the app.
- Production hosting is deferred. Local storage work can proceed.
