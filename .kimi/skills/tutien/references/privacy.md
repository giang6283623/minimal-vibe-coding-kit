# tutien privacy model

## What is read

- **Git metadata** in the current repo (read-only `git log`): commit hashes, subjects, timestamps, revert flags. No working-tree contents.
- **Explicitly supplied export files** the user passes by exact path (`sources=…`): `tutien-generic-v1` JSONL or plain transcripts.
- **Known root manifests** advertised during preview: `backbone.yml`, package/runtime manifests, lockfiles, and language config files from the fixed allowlist in `project-profile.mjs`. Symlinks and files above 1 MiB are ignored. Script bodies are never returned, persisted, or executed.

Never read: the home directory, global tool history, other repos, arbitrary source files, or unadvertised paths. `preview` shows supplied evidence files, known manifest inventory, sizes, and date window before content is read; the approval token includes manifest size and modification time.

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

`latest-brief.json` contains only aggregate evidence, safe project slugs, allowlisted stack names, generated validation commands based on script names, story pointers, and composition constraints. It never contains package script bodies, arbitrary manifest values, raw event IDs, or stock response prose.

The optional living chronicle uses `.vibekit/reports/tutien/story/`:

- `latest-context.json` contains only project slugs, aggregate coverage, disjoint token totals, realm/classification slugs, problem types, progression aggregates, and a 16-hex evidence key.
- `plot.md` and `chapters/*.md` contain agent-authored fiction derived from approved aggregates and non-secret repository metadata already in task scope.
- `story-state.json` contains the selected language/style, last chapter number, and consumed evidence keys.

Story files must never contain raw prompts, conversation excerpts, commit subjects, author names/emails, raw event IDs, URLs, secret values, or source-file contents. Do not turn a real contributor into a character without explicit user permission. Fictional character names are locally generated and are not identity mappings.

## Deletion, retention, reset, export

- **Retention:** keep the newest N snapshots; `snapshotsToPrune()` returns the rest as a list to remove.
- **Delete/reset:** use the repo safe-delete policy — prefer `trash <path>`; never a silent `rm`. Deleting `.vibekit/reports/tutien/` resets all trend history.
- **Export:** a snapshot is plain JSON; copy the file. It already contains no raw content.
- **Story export:** copy `story/` only after reviewing the fictional prose for project-sensitive metaphors. The deterministic context remains aggregate-only, but the user's chosen plot may itself be private.
