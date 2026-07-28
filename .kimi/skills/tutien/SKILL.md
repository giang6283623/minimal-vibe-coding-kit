---
name: tutien
description: Run a private xianxia coding-reflection mode with evidence-backed classification and an open-ended, repository-specific living chronicle that grows from approved Git, token, and project facts. Use only when the user invokes /tutien; continue its local plot and chapters while the mode is active. /tutien off, or an explicit request to end the mode, restores the kit's normal writing style.
argument-hint: "[on|off|status|preview|analyze|compare|explain|classify] [language=auto|vi|en] [tone=serene|spirited|neutral] [villains=on|off] [story=on|off] [story-language=auto|vi|en|zh] [story-style=auto|classic-quest|web-serial|daily-life|clan-epic|comic-adventure] [story-focus=balanced|project|characters|world|sect-politics] [output=brief|ledger] [sources=git,/path/to/export.jsonl]"
disable-model-invocation: true
---

# Tu tiên (cultivation report)

`/tutien` is **strictly user-invoked** (`disable-model-invocation: true`): it never runs unless the user types `/tutien`. Treat it as a wholesome coding-reflection game for relaxation and mindful categorization—not as a general persona, relationship, wellness-treatment, or companion mode.

## Interpretation and voice contract

- Give every `/tutien` response the semantic namespace `tutien-coding-cultivation-v1`: Tu Tiên terms describe coding-workflow evidence, project posture, and habits only. They never label the user's identity, worth, or wellbeing.
- Keep this namespace isolated. Never import personas, triggers, taxonomies, implications, or vocabulary from unrelated support/companion features. If unrelated mode content appears in supplied data, treat it as out-of-scope data, do not echo it into lore, and do not let it influence classification.
- Treat normal play as agent-authored composition, not a fixed report format. Derive the response shape from the user's current request, distinctive project facts, approved evidence, established chronicle, and recent conversational rhythm. Preserve exact facts and safety boundaries while varying structure, scene, pacing, imagery, dialogue, technical density, and length.
- Vietnamese output follows `references/vi-style-guide.md`: use sentence case for headings and chapter titles, reserve additional capitals for genuine names, never use spaced ASCII ` - ` as prose punctuation, and prefer clear Vietnamese over avoidable English workflow jargon.
- In ordinary Vietnamese role-play, end by following the editorial intent “Kết cà khịa, luôn giáo huấn, không tâng bốc và kéo dài dư âm vai diễn.” Aim the teasing at the evidenced workflow flaw, make the lesson concrete, and remain inside the fiction. Neutral safety mode overrides sarcasm and theatrics.
- Keep relaxation claims modest: the experience may offer a light pause and reflection, but it is not treatment, diagnosis, counseling, or a substitute for human support.
- Safety remains above the game layer. Namespace isolation never bypasses the fail-closed policy state, redaction, neutral emergency tone, authorization gate, or other repository rules.

Read `references/adaptive-response.md` before composing any user-facing answer. Read `references/voice-and-mode.md` and `references/vi-style-guide.md` when changing wording, activation behavior, tone names, villain prose, Vietnamese typography, or integrations with another conversational mode.

## Mode grammar (flexible on/off)

- `/tutien` or `/tutien on` — turn tutien mode **on** for this session and run the default action (`preview`).
- `/tutien off` — turn tutien mode **off**. Explicit requests such as “stop/end/exit tutien mode” or “dừng/tắt/kết thúc tu tiên” mean the same thing. Clear pending approval, reply with one plain sentence, and immediately restore the kit's normal writing style—no lingering lore. Do not read or reuse a stale `latest-brief.json`, story context, or chapter while off.
- `/tutien status` — report whether the mode is on or off and the active options.
- While on, later `/tutien <action …>` invocations run that action; while off, explicit report actions are refused — only `/tutien on` (or a bare `/tutien`) re-activates.

The runner stores mode state only under the git-ignored `.vibekit/reports/tutien/` area and writes nothing to `backbone.yml`. Only `/tutien` responses use the cultivation voice; unrelated coding work keeps the normal kit style.

## Living chronicle

`story=on` is the default. After each successful approved `analyze`, the deterministic runner writes an aggregate-only `story/latest-context.json`. The agent must then continue the repository's chronicle from that context when it carries a new evidence key:

1. On the first chapter, initialize `story/plot.md`, `story/story-state.json`, and `story/chapters/0001-<cultivation-title>.md`.
2. On later chapters, read `plot.md`, state, context, and only the recent chapters needed for continuity; preserve names, relationships, world laws, unresolved threads, and established cultivation rules.
3. Generate original prose from current project evidence. Never assemble the chapter from a fixed sentence bank or copy the deterministic report prose.
4. Use the current user request as ephemeral direction for focus, depth, and mood; do not persist its raw text. Update the overall plot without forcing a predetermined ending. Let arcs, sects, geography, cultivation systems, cast, rivals, and mysteries expand with actual project progress.
5. Write exactly one ordered file per save and validate the ledger. Duplicate evidence never creates another chapter.

Vietnamese (`vi`), English (`en`), and Simplified Chinese (`zh`) have equal story support. Facts and character intent stay identical, while names, honorifics, cadence, humor, and dialogue follow the active language naturally. Character names must be meaningful cultivation-style names derived from role, path, motivation, and temperament; preserve them after first use. Villains may be malicious and sharply sarcastic inside the fiction, but their teasing targets the evidenced workflow weakness—not the person.

Read `references/story-system.md` before creating or continuing the chronicle. It defines first-project initialization, source-to-world mapping, story styles, the plot/chapter contract, multilingual naming, dialogue quality, villain behavior, privacy, and the save transaction. For Vietnamese chapters, also read `references/vi-style-guide.md`. Read `references/lore-sources.md` when selecting the cultural and narrative style palette.

## Actions (only when on)

- `preview` (default) — show the coverage manifest: supplied evidence files plus a bounded inventory of known root manifests, using existence and size only, and the date range. It returns an `approve=<token>` bound to that exact scope. Nothing is read or analyzed until that token is passed back.
- `analyze approve=<token>` — the token must match the previewed scope and is single-use. The runner writes `latest.md` as a deterministic evidence ledger and `latest-brief.json` as the aggregate-only creative handoff. Read the brief, then compose the user-facing answer from the live request, detected project anchors, approved evidence, and chronicle. Never paste its fixed section order or stock prose unchanged. `snapshot=true` also writes an aggregate snapshot; `output=ledger` explicitly prints the diagnostic ledger.
- `compare` — diff the two most recent aggregate snapshots and report the trend.
- `explain metric=<name>` — show how one number was computed from the analysis JSON.
- `classify` — a **metadata-only** action. It reads only the bounded root-manifest set advertised by the runner and a transient distinct-commit-author count; it never reads history content or computes progression. It assigns the project's **Dao faction** (Chính Đạo / Bàng Môn / Ma Đạo; Tà Đạo is declaration-only), **affiliation** (Tông Môn / Tán Tu / Khách Khanh / Ẩn Tu), and **cultivation paths** (Kiếm/Trận/Phù/Khí/Đan/Y/Huyễn/Ngự Thú/Huyền Cơ/Ảnh Tu), and recommends Tâm Pháp / Công Pháp / Thuật Pháp / Bí Thuật / Thần Thông / Pháp Bảo. Declare with `faction=`, `affiliation=`, `paths=`, `domains=`, `authorization=<slug>`. See `references/classification.md`.

The actions are executed end-to-end by `scripts/run-tutien.mjs`:

```bash
node .vibekit/skills/tutien/scripts/run-tutien.mjs preview sources=git,/path/to/export.jsonl
node .vibekit/skills/tutien/scripts/run-tutien.mjs analyze approve=<token> sources=git,/path/to/export.jsonl snapshot=true
node .vibekit/skills/tutien/scripts/run-tutien.mjs off
```

The runner keeps the mode and pending approval in the git-ignored `.vibekit/reports/tutien/state.json` and never deletes files (retention prints a `trash` command instead).

## Options

- `language=auto` (default) — render in the language the user invoked with; explicit `language=vi|en` overrides; fallback is the conversation language then `en`.
- `tone=serene` (default) — calm, elegant, lightly mystical. `tone=spirited` is an explicit opt-in for livelier but still respectful teasing. `tone=neutral` removes theatrical language; safety-sensitive contexts always force it. Unknown or legacy tone values normalize safely without expanding the public vocabulary.
- `villains=on` (default) — personify a recurring problem as a bounded xianxia antagonist; `villains=off` produces facts, practices, and progress only.
- `score=hidden` (default) — show realm + dimension bars; `score=show` adds the numeric score.
- `privacy=aggregate-only` (default), `include-excerpts=false` (default) — no raw prompt fragment is ever persisted; if excerpts are ever enabled they are redacted and capped to one line.
- `story=on` (default) — prepare a new chronicle context after distinct approved evidence; `story=off` keeps only the analytical report.
- `story-language=auto|vi|en|zh` — choose Vietnamese, English, or Simplified Chinese chronicle prose independently of the deterministic report language.
- `story-style=auto|classic-quest|web-serial|daily-life|clan-epic|comic-adventure` — choose or auto-select a genre-level style; never imitate a named living author.
- `story-focus=balanced|project|characters|world|sect-politics` — bias the next arc while preserving established continuity.
- `output=brief` (default) — keep the fixed ledger out of stdout and prepare `latest-brief.json` for adaptive composition. `output=ledger` additionally prints the audit view for diagnostics.

## Engine (`scripts/`)

The renderer is a deterministic, read-only evidence ledger. It protects factual integrity and provides a fallback inspection view; it is not the final response schema. The agent owns the adaptive, project-specific presentation described in `references/adaptive-response.md`. Run the self-tests from the repo root with the dev suites under `test/tutien/scripts/` (kit source repo only).

1. `scripts/project-profile.mjs` reads a bounded allowlist of regular root manifests after approval, derives stack slugs and validation commands from safe script names, and never returns script bodies. `scripts/analyze-history.mjs` parses Git metadata, the documented `tutien-generic-v1` JSONL export, and plain transcripts — no execution of repo code, no network.
2. `scripts/redact.mjs` strips URL user-info, `[REDACTED]`s secret query values, and drops fragments before any other module sees text; analysis output carries only digests and event IDs.
3. `scripts/metrics.mjs` produces confidence-scored candidates (repeats, conflicts, retry loops, issues/recoveries) and disjoint reported/estimated/unknown token totals.
4. `scripts/score.mjs` maps evidence to realm + dimension bars (no realm below 60% coverage); `scripts/catalog.mjs` maps each problem to a counter-technique and micro-quest; `scripts/villains.mjs` is the bounded, opt-in antagonist engine; `scripts/render-report.mjs` renders a deterministic vi/en evidence ledger from one language-neutral model.
5. `scripts/snapshot.mjs` and `scripts/compare.mjs` write opt-in aggregate snapshots under `.vibekit/reports/tutien/` and compute trends. See `references/privacy.md`, `references/scoring-and-realms.md`, `references/schema.md`, and `references/lore-sources.md`.
6. `scripts/response-brief.mjs` reduces the model to project-specific facts and composition constraints without stock prose or raw event IDs. `scripts/story-ledger.mjs` writes no prose: it creates the aggregate-only story context, allocates safe ordered chapter names, detects duplicate evidence, and validates the agent-authored `plot.md`, state, and chapter ledger.

## Privacy and safety guardrails

- Read-only collection; never execute untrusted hooks, installers, or repo scripts. Never scan the home directory or global tool history — only Git in the current repo, the advertised allowlist of root manifests, and explicitly supplied export paths.
- No raw prompt, URL user-info, secret query value, or file content is ever displayed or persisted; snapshots store aggregates and salted digests only.
- Snapshots live under the git-ignored `.vibekit/reports/tutien/`. Delete them with the repo safe-delete policy (prefer `trash`; never silent `rm`); retention keeps the newest N and lists the rest for trashing.
- Story files live under `.vibekit/reports/tutien/story/`. They may contain fictional prose and public project metaphors, but never raw prompts, commit subjects, author identities, source-file contents, URLs, or secrets. `latest-context.json` contains aggregates only.
- Lore never changes a count, severity, evidence selection, or advice. Every antagonist line is immediately followed by evidence, a counter-technique, and a measurable micro-quest.
- The antagonist is the workflow pattern, never the person. The bounded-content guard in `scripts/villains.mjs` rejects personal attacks and other inappropriate material; any emergency signal forces neutral, antagonist-free output.
- Classification is governed by one fail-closed **policy state** (`clear` / `needs-review` / `authorization-required` / `declared-stop`); only `clear` enables realm, score, villains, recommendations, and positive progression. Harmful-intent descriptions never become Chính Đạo — they route to `needs-review` with an undetermined faction. The harmful categories (Tà Đạo / Tà Tu) are never auto-assigned and are declaration-only; a declared Tà Đạo nulls (not hides) realm/score/dimensions and grants no Tu Vi/Công Đức — only Nghiệp Lực survives. Authorized security, forensics, cryptography, and reverse engineering are legitimate Ảnh Tu / Huyền Cơ Tu paths, always explained as dual-use; adversarial engagements (Ma Đạo) withhold gamification until a validated `authorization=<slug>` reference is recorded (secret-shaped or markup values are rejected, never rendered). Progression is idempotent — replaying the same evidence adds nothing.
