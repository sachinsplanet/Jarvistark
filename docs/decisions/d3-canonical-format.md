# D3 — Canonical format

**Status:** accepted  
**Date:** 2026-10-15  
**Decide by:** before adding deterministic rendering (build-order step 4)

## Decision

**JSON and NDJSON are canonical.** Generated Markdown is read-only, carries a content-hash header, and is flagged by `validate` if hand-edited. Round-trip import (edited Markdown becoming proposals) is deferred.

## Options considered

**JSON canonical** (chosen) — ledger events as NDJSON (one JSON object per line, hash-chained), claims and tasks as JSON. Generated Markdown documents in `docs/plan/` are views of this data.

- Parseable, machine-checkable, diffable.
- Content-hash header on generated Markdown means `validate` detects out-of-band edits.
- Agents and tools work directly with JSON.

**Markdown as the editable source** — Markdown files are the primary format, parsed into the ledger.

- Brings back the review burden of free-text specifications.
- Makes out-of-band edits the normal path, undermining enforcement.
- Loses the parseable, tool-supported specification that distinguishes Jarvistark from existing spec-driven tools.

## Consequences

- `.jarvistark/ledger/events.ndjson` is append-only and hash-chained.
- `.jarvistark/` contains all canonical JSON data; `docs/plan/` contains generated Markdown.
- `docs/plan/*.md` files carry a `<!-- content-hash: sha256:... -->` header.
- `validate` flags any `docs/plan/` file whose content doesn't match its hash.
- Round-trip Markdown→JSON import is a possible future feature, not a v1 requirement.
