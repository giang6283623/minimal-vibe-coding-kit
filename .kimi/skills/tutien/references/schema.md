# `/tutien` normalized event and analysis schema (v1)

## Generic input format `tutien-generic-v1`

One JSON object per line (JSONL). An optional first line `{"schema":"tutien-generic-v1"}` pins the version; any other `schema` value fails closed. Comment lines start with `#`.

The whole declared schema is validated on ingest and fails closed on: unknown `type`; invalid `role`, `outcome`, `usage.accuracy`; unparseable `ts`; non-string `session`/`task`/`label`/`text`/`usage.requestId`; negative, non-finite, or non-numeric usage numbers; non-boolean `usage.cumulative`; malformed `commit`; and the reserved fields `source`/`__source` (the event source is owned by the adapter, never by export content).

Event object:

| Field | Type | Notes |
| --- | --- | --- |
| `type` | string | `message` \| `tool_call` \| `tool_result` \| `test` \| `approval` \| `commit`. Unknown types fail closed. |
| `session` | string | Session/thread identifier. |
| `task` | string? | Explicit task ID when the export has one (strongest grouping signal). |
| `ts` | ISO-8601? | Timestamp; null allowed. |
| `role` | string? | `user` \| `assistant` \| `tool` \| `git`. |
| `text` | string? | Redacted on ingest; retained in memory only. |
| `usage` | object? | `input`, `cachedInput`, `output`, `reasoning`, `total`, `accuracy` (`reported`\|`estimated`\|`unknown`), `requestId`, `cumulative`. |
| `outcome` | string? | `pass` \| `fail` for `test`/`tool_result`. |
| `label` | string? | Stable name used to pair a failure with its recovery. |
| `commit` | object? | `{ hash, subject, isRevert }` for git events. |

## Analysis output (schemaVersion 1)

```jsonc
{
  "schemaVersion": 1,
  "eventsAnalyzed": 0,
  "coverage": {
    "sessions": 0, "userPrompts": 0, "commits": 0,
    "window": { "start": null, "end": null },
    "tokenCoverage": { "reportedTurnsPct": 0, "estimatedTurnsPct": 0, "unknownTurns": 0 },
    "confidence": "low|medium|high"
  },
  "tokens": {
    "reportedTotal": 0, "estimatedTotal": 0, "unknownTurns": 0,
    "countedRequests": 0, "dedupedStreamUpdates": 0
  },
  "tasks": [ { "taskId": "", "sessionId": "", "grouping": "explicit|derived", "confidence": "high|medium", "eventCount": 0 } ],
  "repetition": {
    "exactRepeats":  [ { "taskId": "", "count": 2, "eventIds": [], "textDigest": "" } ],
    "nearRepeats":   [ { "taskId": "", "eventIds": [], "similarity": 0.9 } ],
    "retryLoopCandidates": [ { "taskId": "", "count": 3, "eventIds": [], "confidence": 0.6 } ]
  },
  "conflicts": [ { "category": "user-user", "taskId": "", "eventIds": [], "phraseDigest": "", "confidence": 0.6 } ],
  "issues": {
    "passes": 0,
    "failures":   [ { "eventId": "", "label": "" } ],
    "recoveries": [ { "issueEventId": "", "recoveryEventId": "" } ],
    "revertCandidates": [ { "eventId": "", "hash": "", "confidence": 0.5 } ]
  },
  "notes": []
}
```

## Phase 2 render model

`render-report.mjs` builds a language-neutral model from the analysis (realm, dimension scores, disjoint token totals, evidence-bound problems, one if-then practice, one lesson) and renders it in `vi` or `en` — the same model feeds both, so counts are identical across languages by construction. `score.mjs` returns `Chưa đủ thiên cơ` (no realm) when known-token coverage is below 60%. `catalog.mjs` emits at most three problems, ranked by `impact × recurrence × confidence × fixability`, each carrying `evidence` (event IDs / counts), a counter-technique, a project-skill pointer, and a micro-quest. Lore never alters a count.

## Privacy invariant

`text` is redacted inside `normalize-events.mjs` and never emitted. **Metadata is digested too**: `session`, `task`, and `label` values become 16-hex SHA-256 prefixes before they reach normalized events, so task/session identifiers in analysis output (`tasks[].taskId`, `tasks[].sessionId`, `issues.failures[].label`) can never carry raw content. Timestamps are canonicalized to UTC ISO or dropped; commit subjects are dropped from the commit object (their redacted form travels only as event text). Analysis output references content solely through `eventId`, `textDigest`, and `phraseDigest`. No field carries raw prompt text, URL user-info, secret query values, or URL fragments.

## Token-evidence invariant

A usage record contributes to reported/estimated totals and coverage only when a **usable total** exists: a finite, positive `total`, or a positive sum of `input + output + reasoning`. A record claiming `accuracy=reported` with no numbers (or zero) is counted as `unknown` and cannot unlock a realm score. Only records marked `cumulative` are streaming counters (last value wins); independent chunks sharing a `requestId` are summed.

## Runner state

`scripts/run-tutien.mjs` executes the actions end-to-end. It stores the session mode and pending single-use approval token in `.vibekit/reports/tutien/state.json`, snapshots under `snapshots/`, the audit ledger as `latest.md`, and the agent handoff as `latest-brief.json`. Preview inspects existence, size, and modification time only; analysis runs only with the matching token for the identical evidence and manifest inventory. The runner never deletes files.

`latest-brief.json` uses `tutien-response-brief-v1`. It carries policy state, safe project identity/stack/validation commands, aggregate evidence, classification/progression slugs, bounded findings without event IDs, an optional story pointer, and composition constraints. Its object shape is not a response layout.

When `story=on`, runner state also stores the selected `storyLanguage`, `storyStyle`, and `storyFocus` for the current repository. A successful approved analysis writes `.vibekit/reports/tutien/story/latest-context.json`; it does not write creative prose.

## Living chronicle schemas

`latest-context.json` uses `tutien-story-context-v1` and contains:

- a deterministic 16-hex `evidenceKey` derived from aggregate facts;
- `language`, `style`, `focus`, `policyState`, and `canWriteChapter`;
- safe project, stack, metadata-source, and generated validation-command slugs plus an aggregate author count;
- coverage, reported/estimated/unknown token totals, realm/score, problem types, classification slugs, and progression aggregates.

It never contains `text`, prompts, commit subjects, event IDs, author identities, file contents, URLs, or classification rationale.

`story-state.json` uses `tutien-story-state-v1` with `language`, `style`, contiguous `lastChapter`, and unique `consumedEvidenceKeys`.

Each `chapters/NNNN-<localized-xianxia-title>.md` uses YAML frontmatter:

```yaml
---
schema: tutien-story-chapter-v1
chapter: 1
title: "Localized title"
language: vi
evidence_key: 0123456789abcdef
---
```

Chapter numbers are contiguous and one evidence key may appear in at most one chapter. `scripts/story-ledger.mjs validate` checks these invariants plus the presence of `plot.md` and agreement with `story-state.json`.

## Determinism invariant

Given the same inputs and options, `analyze()` returns byte-identical JSON. No randomness, no wall-clock reads, no ordering that depends on object insertion beyond the input order.
