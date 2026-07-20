# tutien privacy model

## What is read

- **Git metadata** in the current repo (read-only `git log`): commit hashes, subjects, timestamps, revert flags. No working-tree contents.
- **Explicitly supplied export files** the user passes by exact path (`sources=…`): `tutien-generic-v1` JSONL or plain transcripts.

Never read: the home directory, global tool history, other repos, or any path the user did not name. `preview` shows the exact file list and date window before anything is read; nothing is read or written until the user approves that scope.

## What is redacted (before anything else sees it)

`scripts/redact.mjs` is the single choke point. On ingest it:

- strips URL user-info (`user:pass@host`);
- replaces sensitive query values (`token`, `key`, `secret`, `password`, `auth`, `signature`, `code`, and case/encoding variants) with `[REDACTED]`;
- drops URL fragments;
- masks bearer/authorization tokens and AWS-key-shaped strings in free text.

Normalized events keep redacted text in memory for the run only. The analysis JSON references content solely through `eventId`, `textDigest`, and `phraseDigest` (16-hex SHA-256 prefixes).

## What is persisted (only with approval)

Aggregate snapshots under the git-ignored `.vibekit/reports/tutien/`:

- coverage, disjoint reported/estimated/unknown token totals, metric counts, dimension scores, realm, thresholds, adapter versions, villain cooldown state, and **salted** evidence-id digests.

Never persisted: raw prompts, URLs, secrets, file contents, or unsalted event IDs. `aggregate-only` is the default; excerpts are off by default and, if ever enabled, are redacted and capped to one line.

## Deletion, retention, reset, export

- **Retention:** keep the newest N snapshots; `snapshotsToPrune()` returns the rest as a list to remove.
- **Delete/reset:** use the repo safe-delete policy — prefer `trash <path>`; never a silent `rm`. Deleting `.vibekit/reports/tutien/` resets all trend history.
- **Export:** a snapshot is plain JSON; copy the file. It already contains no raw content.
