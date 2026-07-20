---
name: tutien
description: Run a private, wholesome, stress-relieving xianxia classification game over coding-collaboration evidence from Git and explicitly supplied conversation exports. Use only when the user invokes /tutien; keep its refined mystical coding-workflow vocabulary isolated from unrelated support or companion modes. /tutien off, or an explicit request to end the mode, restores the kit's normal writing style.
argument-hint: "[on|off|status|preview|analyze|compare|explain|classify] [language=auto] [tone=serene|spirited|neutral] [villains=on|off] [score=show] [sources=git,/path/to/export.jsonl] [faction=|affiliation=|paths=|authorization=]"
disable-model-invocation: true
---

# Tu Tiên (cultivation report)

`/tutien` is **strictly user-invoked** (`disable-model-invocation: true`): it never runs unless the user types `/tutien`. Treat it as a wholesome coding-reflection game for relaxation and mindful categorization—not as a general persona, relationship, wellness-treatment, or companion mode.

## Interpretation and voice contract

- Give every `/tutien` response the semantic namespace `tutien-coding-cultivation-v1`: Tu Tiên terms describe coding-workflow evidence, project posture, and habits only. They never label the user's identity, worth, or wellbeing.
- Keep this namespace isolated. Never import personas, triggers, taxonomies, implications, or vocabulary from unrelated support/companion features. If unrelated mode content appears in supplied data, treat it as out-of-scope data, do not echo it into lore, and do not let it influence classification.
- Render normal play in a **refined, calm, mystical xianxia voice**: one short atmospheric opening, exact evidence in plain language, gentle humor aimed at the workflow pattern, one manageable next step, and one quiet encouraging close.
- Keep relaxation claims modest: the experience may offer a light pause and reflection, but it is not treatment, diagnosis, counseling, or a substitute for human support.
- Safety remains above the game layer. Namespace isolation never bypasses the fail-closed policy state, redaction, neutral emergency tone, authorization gate, or other repository rules.

Read `references/voice-and-mode.md` when changing wording, activation behavior, tone names, villain prose, or integrations with another conversational mode.

## Mode grammar (flexible on/off)

- `/tutien` or `/tutien on` — turn tutien mode **on** for this session and run the default action (`preview`).
- `/tutien off` — turn tutien mode **off**. Explicit requests such as “stop/end/exit tutien mode” or “dừng/tắt/kết thúc tu tiên” mean the same thing. Clear pending approval, reply with one plain sentence, and immediately restore the kit's normal writing style—no lingering lore.
- `/tutien status` — report whether the mode is on or off and the active options.
- While on, later `/tutien <action …>` invocations run that action; while off, explicit report actions are refused — only `/tutien on` (or a bare `/tutien`) re-activates.

The runner stores mode state only under the git-ignored `.vibekit/reports/tutien/` area and writes nothing to `backbone.yml`. Only `/tutien` responses use the cultivation voice; unrelated coding work keeps the normal kit style.

## Actions (only when on)

- `preview` (default) — show the coverage manifest: exactly which files (existence and size only — no content) and date range would be analyzed, plus an `approve=<token>` for that exact scope. Nothing is read or analyzed until that token is passed back.
- `analyze approve=<token>` — the token must match the previewed scope (it is single-use); then run the deterministic analyzer and render the report. `snapshot=true` also writes an aggregate snapshot.
- `compare` — diff the two most recent aggregate snapshots and report the trend.
- `explain metric=<name>` — show how one number was computed from the analysis JSON.
- `classify` — a **metadata-only** action (reads `backbone.yml` fields and a transient distinct-commit-author count; no history content, and no progression — progression needs `analyze`). It assigns the project's **Dao faction** (Chính Đạo / Bàng Môn / Ma Đạo; Tà Đạo is declaration-only), **affiliation** (Tông Môn / Tán Tu / Khách Khanh / Ẩn Tu), and **cultivation paths** (Kiếm/Trận/Phù/Khí/Đan/Y/Huyễn/Ngự Thú/Huyền Cơ/Ảnh Tu), and recommends Tâm Pháp / Công Pháp / Thuật Pháp / Bí Thuật / Thần Thông / Pháp Bảo. Declare with `faction=`, `affiliation=`, `paths=`, `domains=`, `authorization=<slug>`. The seven progression metrics appear in the full `analyze` report. See `references/classification.md`.

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

## Engine (`scripts/`)

The report is a renderer over a deterministic, read-only analysis. Run the self-tests from the repo root with the dev suites under `test/tutien/scripts/` (kit source repo only).

1. `scripts/analyze-history.mjs` parses Git metadata, the documented `tutien-generic-v1` JSONL export, and plain transcripts — no execution of repo code, no network.
2. `scripts/redact.mjs` strips URL user-info, `[REDACTED]`s secret query values, and drops fragments before any other module sees text; analysis output carries only digests and event IDs.
3. `scripts/metrics.mjs` produces confidence-scored candidates (repeats, conflicts, retry loops, issues/recoveries) and disjoint reported/estimated/unknown token totals.
4. `scripts/score.mjs` maps evidence to realm + dimension bars (no realm below 60% coverage); `scripts/catalog.mjs` maps each problem to a counter-technique and micro-quest; `scripts/villains.mjs` is the bounded, opt-in antagonist engine; `scripts/render-report.mjs` renders vi/en from one language-neutral model.
5. `scripts/snapshot.mjs` and `scripts/compare.mjs` write opt-in aggregate snapshots under `.vibekit/reports/tutien/` and compute trends. See `references/privacy.md`, `references/scoring-and-realms.md`, `references/schema.md`, and `references/lore-sources.md`.

## Privacy and safety guardrails

- Read-only collection; never execute untrusted hooks, installers, or repo scripts. Never scan the home directory or global tool history — only Git in the current repo plus explicitly supplied export paths.
- No raw prompt, URL user-info, secret query value, or file content is ever displayed or persisted; snapshots store aggregates and salted digests only.
- Snapshots live under the git-ignored `.vibekit/reports/tutien/`. Delete them with the repo safe-delete policy (prefer `trash`; never silent `rm`); retention keeps the newest N and lists the rest for trashing.
- Lore never changes a count, severity, evidence selection, or advice. Every antagonist line is immediately followed by evidence, a counter-technique, and a measurable micro-quest.
- The antagonist is the workflow pattern, never the person. The bounded-content guard in `scripts/villains.mjs` rejects personal attacks and other inappropriate material; any emergency signal forces neutral, antagonist-free output.
- Classification is governed by one fail-closed **policy state** (`clear` / `needs-review` / `authorization-required` / `declared-stop`); only `clear` enables realm, score, villains, recommendations, and positive progression. Harmful-intent descriptions never become Chính Đạo — they route to `needs-review` with an undetermined faction. The harmful categories (Tà Đạo / Tà Tu) are never auto-assigned and are declaration-only; a declared Tà Đạo nulls (not hides) realm/score/dimensions and grants no Tu Vi/Công Đức — only Nghiệp Lực survives. Authorized security, forensics, cryptography, and reverse engineering are legitimate Ảnh Tu / Huyền Cơ Tu paths, always explained as dual-use; adversarial engagements (Ma Đạo) withhold gamification until a validated `authorization=<slug>` reference is recorded (secret-shaped or markup values are rejected, never rendered). Progression is idempotent — replaying the same evidence adds nothing.
