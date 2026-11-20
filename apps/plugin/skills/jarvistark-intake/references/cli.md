# Intake, sources, and review

In these examples, replace `jarvistark` with the [verified CLI invocation](../../jarvistark/references/cli.md) and use the absolute app path with `--workspace`. Pass absolute paths to scratch files and use JSON serialization for payloads containing user text.

## Record the idea and answers

For a new workspace, save the user's nonempty original idea verbatim in a UTF-8 scratch file and run `init /absolute/path/to/idea.md` once. For an existing workspace, run `status` to read the immutable `intake.originalText`, recorded `intake.clarifications`, and current claim states. If `status` fails, distinguish a missing journal from an unreadable or invalid one before initializing.

Run `clarify /absolute/path/to/answer.json` for each answer. Use the actual question and answer with a current ISO timestamp. Reuse the session ID for the same interview and use a fresh question ID for each new answer or correction. If you normalize the answer, keep the user's exact response in `rawAnswer`.

```json
{
  "sessionId": "SESS-001",
  "question": {
    "id": "Q1",
    "text": "Who can read a saved entry?",
    "answer": "Only the account that created it.",
    "answeredAt": "2026-11-16T10:00:00.000Z"
  }
}
```

## Cite the recorded source

A `user-stated` claim needs one of these sources.

- Cite the original idea with `{"type":"input-span","input":"input/original.md","start":0,"end":29}`. Use the verbatim `intake.originalText` from `status`. Find the supporting excerpt with JavaScript `indexOf`, select the intended occurrence if the text repeats, and add the excerpt's `.length` to the start. These are UTF-16 code-unit offsets, with an exclusive end. Check that `originalText.slice(start, end)` matches the exact excerpt and supports the claim's wording.
- Cite an answer with `{"type":"clarification","sessionId":"SESS-001","questionId":"Q1"}`. Check the answer and both IDs in `status`.

Use `inferred` or `recommended` for details that go beyond the recorded text. Use `observed` for checked repository facts and cite them with an `observation` source containing `file` and `evidence`.

## Submit a claim proposal

Run `propose /absolute/path/to/claims.json`. Choose an unused `PRP-<digits>` ID, use a current ISO timestamp, and give each new claim a unique `$`-prefixed key. The latest event's `snapshot.proposals` in `export` shows prior proposal IDs. Claim kinds are `requirement`, `constraint`, `assumption`, `question`, and `decision`.

```json
{
  "id": "PRP-001",
  "planner": { "role": "host-agent", "id": "jarvistark-intake" },
  "createdAt": "2026-11-16T10:01:00.000Z",
  "ops": [
    {
      "op": "add",
      "key": "$visibility",
      "claim": {
        "kind": "constraint",
        "origin": "user-stated",
        "text": "Only the account that created an entry can read it.",
        "source": { "type": "clarification", "sessionId": "SESS-001", "questionId": "Q1" }
      }
    }
  ]
}
```

On success, `minted` maps the provisional keys to claim IDs in state `proposed`. On failure, use the returned error paths and codes to fix the scratch payload and retry through the CLI.

To correct a current claim, use a `revise` op with a fresh provisional `key`, the current claim ID as `target`, and the changed fields in `claim`. Provide the origin explicitly and include a recorded source for each `user-stated` revision. Record new answers with `clarify` before citing them. The target stays current until the person approves the new ID.

For an unresolved issue that prevents handoff, propose a claim with `kind: "question"` and `blocking: true`. To resolve it, first record the user's answer with `clarify`. Then revise the question with `kind: "decision"`, `blocking: false`, `origin: "user-stated"`, the answer as decision text, and its clarification source. Review the new decision ID. The original question remains open until the person approves the decision or rejects the question with a reason. When the decision is accepted, the original question displays as `rejected` with `supersededBy` pointing to the decision.

## Review and hand off

Show each proposed claim's minted ID, text, and source or rationale. If it revises another claim, show the target and what changed. Open the [workspace review](../../jarvistark/references/cli.md#workspace-review). The person selects claims and records their decisions there. Use only proposed IDs and reserve question IDs for `reject`. For a revision, put the replacement ID alone in place of its target. Use chat to collect responses or select claims for review, then read `status` to verify the recorded outcome.

After review, run `status` and `validate`. In the handoff, give the absolute workspace and any local CLI path, the current accepted intake claim IDs and text, and any unresolved blocking question IDs, text, and next decision needed. Identify pending review separately if the person paused. The ledger is authoritative. Refresh the claim states in that workspace before proceeding, using `UNRESOLVED_BLOCKING_QUESTION` findings or proposed questions with `blocking: true` to identify active blockers.
