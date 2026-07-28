# Changelog

## Unreleased

## 0.5.4 - 2026-07-28

### Added

- Added `the-creator` across Claude, Cursor, Codex, Grok, and Kimi. Its ten cumulative creativity levels each relax one additional 10% category of eligible conventions for art, design, interfaces, methods, processes, systems, and other invention, while an immutable floor preserves instruction precedence, safety, authorization, evidence, accessibility, validation, and functional acceptance.
- Added a width-aware `--format=ascii-3d` graph view for Cursor CLI, Claude Code, Codex CLI, Grok CLI, Kimi CLI, and plain terminals. It derives topological depth, renders portable pseudo-3D node boxes, numbers every artifact edge, marks the structural critical path, explains blockers, escapes unsafe terminal labels, rejects unknown state, and falls back to a wrapped compact ledger on narrow or dense graphs. Mermaid output separately encodes graph delimiters, removes bidi controls, and pins strict security mode.
- Added a native Kimi Code CLI surface: `.kimi-code/skills/` mirrors all 18 skills (Kimi Code's project-level brand skills directory per the official `kimi-code` discovery order, with the generic `.agents/skills/` also discovered), `.kimi-code/README.md`, a `kimi` install/update profile in `mvck.mjs` (included in `all`), and registration across `skills-manifest.json`, `validate-kit.mjs`, `test-install.mjs`, `backbone.yml` `agent_surfaces`, npm package files, and the English, Vietnamese, and Chinese docs. Kimi Code already loads the root `AGENTS.md` at project level, so existing installs keep working without changes.
- Added a deterministic graph renderer to `graph-engineering-verified-orchestration` (all mirrors): `scripts/render-graph.mjs` turns a graph ledger JSON into a styled Mermaid flowchart for app surfaces or ASCII views for CLI terminals, with schema, duplicate-id, unknown-edge, and cycle validation plus a deterministic critical path. `references/graph-visualization.md` documents the rendering contract; 39 offline checks cover the renderer.
- Added a writing-style guardrail banning emoji and em/en dashes in generated prose: `.cursor/rules/050-writing-style.mdc` (always-on), `.claude/rules/writing-style.md`, `.grok/rules/writing-style.md`, an `AGENTS.md` managed-block section, and a `backbone.yml` `custom_rules` entry.
- Added response-format rules across the Claude, Cursor, and Grok rule surfaces plus the `AGENTS.md` managed block (which also covers Codex and Kimi): outcome-first answers with short main points, decision tables with the fixed columns Option, What it does, Cost, Risk, Recommended, and a Done / Next / Decision needed status block at the end of multi-step work, registered in `backbone.yml` `custom_rules`.
- Added proportional-effort rules on the same surfaces: one-line task triage (trivial, small, medium, large) with matching process weight so review never costs more than the change itself, a ban on heavy loops (parallel-analysis, graph orchestration, multi-agent review, visual, e2e) for trivial or small tasks, and a 0-6 scored gate that requires explicit user approval before any `visual-design-loop` or e2e run.

### Changed

- The graph renderer's default `--format=both` output now pairs Mermaid with ASCII 3D instead of the legacy ASCII wave list. Consumers that require the previous schedule-first text can request `--format=ascii` explicitly.
- `validate-kit.mjs` now derives mirror surface directories and the frontmatter scan list from the manifest's own `surfaces` map instead of hardcoded lists, so a surface registered in `skills-manifest.json` cannot drift from mirror validation.
- `mvck doctor` is now read-only by default: it no longer executes `validate-kit.mjs` or the AgentShield probe from the target repository unless the new `--run-repo-checks` flag is passed. The report and the JSON output mark the checks as present but not executed.
- The Kimi surface directory follows the current Kimi Code CLI product layout (`.kimi-code/` instead of the older Kimi CLI `.kimi/`), matching the official discovery order now that the older CLI repository is being wound down.
- The `AGENTS.md` visual design loop trigger no longer says "always use": it scores the need 0-6 and requires user approval at 5-6 before any loop starts; the `visual-design-loop` skill adds the same gate to its contract on all mirrors.

### Fixed

- The graph renderer rejects node ids that collide after Mermaid id sanitization (for example `A-B` and `A_B` both became `A_B` and collapsed into one rendered node).
- The graph cycle CLI test writes its fixture to a unique temporary directory instead of overwriting and permanently deleting the fixed path `fixtures/cyclic-graph.json`.
- `.cursor/cli.json` ships a read-only `permissions.allow` list next to the existing `deny` list so non-interactive Cursor CLI runs can execute read-only commands without prompting.

### Validation

- `npm run validate:all` passed with zero validator failures or warnings, all 39 graph renderer checks, a clean deterministic AgentShield probe, and all 752 skill files on disk included in a package tarball of 849 files.
- Synchronized release version `0.5.4` across package metadata, Codex plugin metadata, and all three README badges.

## 0.5.3 - 2026-07-27

### Added

- Added `graph-engineering-verified-orchestration` as a portable user-invoked skill across the canonical, Claude, Cursor, Codex, and Grok surfaces. It converts large work into bounded artifact dependency graphs with critical-path checks, enforceable state and semantic isolation, protected verification oracles, resource/retry budgets, rollback semantics, exact human gates, and accepted-only merging.
- Added a reusable graph contract covering plan-only versus execute authority, node/edge/state ledgers, risk and blast radius, verifier effects, immutable input/graph digests, bounded discovery, cleanup, partial results, and irreversible R2 handling.

### Changed

- Documented the skill in the English, Vietnamese, and Simplified Chinese READMEs with a Vivid Clay Mermaid flow. Updated skill counts and install guidance without hardcoding provider-specific concurrency or pricing claims.
- Added a collapsible "Read more: a real example" case study to the graph-engineering section of all three READMEs - a three-service logger migration explaining when, where, and why to use the skill (and when not), with an example prompt and a localized Vivid Clay case-graph diagram whose edges carry named artifacts.

### Validation

- Added permanent validator gates for artifact-edge economics, authority separation, exact approval binding, enforced isolation, verification-oracle protection, bounded failures, localized discovery, Mermaid legibility, and package inclusion. The deterministic validator grew from 598 to 635 passing checks with zero failures or warnings.

## 0.5.2 - 2026-07-26

### Added

- Added a `mermaid` skill (canonical + Claude/Cursor/Codex/Grok mirrors) that generates styled Mermaid diagrams for all 31 diagram types with per-type syntax references, the Vivid Clay preset, and a rendered `preview.html` verification page. Vetted and integrated via `/claim` from a user-supplied local skill clone; foreign plugin contracts were removed, while the imported Mermaid documentation retains upstream authorship and its MIT notice in `UPSTREAM-NOTICE.md`. The source clone's eval harness was intentionally not imported.
- Added kit-specific mermaid behavior: diagram density and type choice adapt to the active `/coding-level` (`references/coding-level-charts.md`); document generation offers a one-time "include diagrams? yes/no"; debugging offers a workflow chart with red/amber suspicion zones that pinpoint the likely bug location (`references/debug-heatmap.md`).
- Added a strong color palette for large-area marks to the Vivid Clay preset and fixed the three weakest chart types: timeline no longer shows clashing auto-inverted accent underlines (`cScaleInv` pinned to ink), kanban uses a Mermaid 11.16-render-verified `cScale2`-`cScale5` compatibility mapping plus `priority` metadata, and xychart ships a bold colorblind-safe blue/orange plot palette with data labels for bars.

### Changed

- Visualized all three READMEs (English, `docs/README.vi.md`, `docs/README.zh-CN.md`) with three Vivid Clay Mermaid flowcharts each - the Quick Start approval flow, "How the pieces connect" (replacing the ASCII sketch), and the autoresearch contract loop. Diagram labels follow each document's language on the Vietnamese-safe mono font stack.
- Led the Guide, Commands, and Skills sections of all three READMEs with section visuals - a day-to-day usage flowchart, a command-lifecycle flowchart, and a 16-skill category chart - and collapsed each section's original list or table behind a localized "Read more" / "Xem thêm" / "查看更多" toggle, matching the existing Troubleshooting pattern.
- Fixed GitHub dark-mode legibility of the README diagrams after screenshots showed ink frontmatter titles vanishing on the transparent canvas and unreadable mindmap labels: removed the `title:` line from every README diagram (section headings already name them) and replaced the 16-skill mindmap with a four-column subgraph flowchart whose classDefs pin every label's fill and text color.
- Extended the Vivid Clay preset (all five skill mirrors) with a theme-following-hosts section: omit frontmatter titles on hosts like GitHub that render on a transparent theme-following canvas, documented that Mermaid 11.16 mindmaps ignore pinned `cScaleLabel` values (third timeline/mindmap/kanban trap), added the flowchart catalog pattern as the dark-safe alternative, and added a matching legibility-checklist gate.
- Enhanced the `sequential-thinking` skill with a closed public-checkpoint vocabulary (`[REVISION]`, `[BRANCH]`, `[HYPOTHESIS]`, `[VERIFICATION]`, `[CONVERGENCE]`, `[META]`, `[FINAL]`), a hypothesis→verification debugging loop, dynamic expand/contract totals, revision-cascade reassessment, and explicit/implicit application modes. Replaced pseudo-MCP runtime claims and long thought transcripts with concise evidence summaries and kit-native cases.
- Added kit-authored Mermaid cases for safe configuration promotion, repository safety evolution, localization release work, validation feedback time, and duplicate-webhook debugging. Updated the executable gallery to the strong palette and corrected high-risk red text to an AA-compliant 5.75:1 contrast.
- Reconciled the imported Mermaid reference snapshot with its executable Mermaid 11.16 boundary: local links now resolve, upstream links are immutable, unavailable development-only syntax is explicitly marked, and the exact preserved MIT license remains in `UPSTREAM-NOTICE.md`.
- Pinned optional AgentShield invocations to `ecc-agentshield@1.4.0`, made package execution approval-aware, and expanded the deterministic local probe to cover the kit's complete agent-surface file set.
- Added permanent validator gates for sequential-thinking's public contract, Mermaid mirror parity and strict-mode examples, local reference links, runtime pins, unavailable-syntax warnings, visual-palette invariants, and AgentShield command pinning.

### Validation

- Registered the new skill and references in `skills-manifest.json`, the validator's required-file registry, and the npm `files` manifest. The initial aggregate suite grew from 708 to 764 passing checks; the second-pass deterministic validator grew from 565 to 598 checks. `npm run validate:all` passes, including installer sandboxes, all Tutien suites, the local AgentShield probe, and an npm dry-run containing all 589 on-disk skill files.
- Synchronized the release version to `0.5.2` in `package.json`, `.codex-plugin/plugin.json`, and all three README badges.

## 0.5.1 - 2026-07-22

### Added

- Added a `/tutien` living chronicle that turns each repository's approved aggregate Git, token, classification, and progression evidence into an open-ended agent-authored xianxia serial. Each project keeps a local `plot.md`, continuity state, aggregate-only context, and one ordered chapter file per distinct evidence window under the git-ignored `.vibekit/reports/tutien/story/` directory.
- Added equal chronicle support for Vietnamese, English, and Simplified Chinese, including language-native xianxia naming, honorifics, dialogue cadence, humor, chapter titles, and safely sarcastic antagonists whose malice targets workflow weaknesses rather than people.
- Added `story-ledger.mjs` and deterministic tests for multilingual filenames, aggregate-only context, contiguous chapters, duplicate evidence rejection, and story transaction validation.

### Changed

- Reframed `/tutien` story writing as an evidence-plus-agent hybrid: deterministic scripts preserve facts and privacy, while agents create project-specific plots, characters, sects, realms, techniques, and dialogue without relying on fixed story sentences.
- Replaced the fixed report-shaped default response with an aggregate-only `latest-brief.json` handoff. It detects safe project anchors from known manifests, recommends real repository validation commands, and leaves structure, pacing, scene, dialogue, and closing imagery to the agent; `output=ledger` preserves the deterministic audit view.
- Expanded the cultural reference notes into a verified, genre-level writing palette covering path/learning metaphors, classical journey traditions, modern web-serial progression, daily-life cultivation, clan/sect epics, and cultivation-game procedural structure without imitating named living authors.

### Security and privacy

- Living-chronicle context persists only project slugs and aggregate metrics. Raw prompts, event IDs, commit subjects, contributor identities, URLs, secrets, and source-file contents remain excluded from context, state, plot, and chapters.

### Validation

- Expanded `/tutien` coverage to **158 deterministic, offline checks**, including project-profile privacy, response-brief composition, living-chronicle, preference sanitization, manifest-bound approval, optional ledger output, and on/off suppression.
- Synchronized the release version to `0.5.1` in `package.json`, `.codex-plugin/plugin.json`, and all three README badges.

## 0.5.0 - 2026-07-20

### Added

- Added `/claim <request>` across Claude Code, Cursor, Codex, and Grok. It validates official sources, rejects unsafe or misleading URLs, checks new ideas against `backbone.yml` and existing repository conventions, stops for decisions when approval is required, and integrates only the smallest reviewed change with an evidence ledger.
- Added `/tutien`, a private, user-invoked xianxia coding-classification game built from Git history and explicitly supplied conversation exports. It provides deterministic vi/en reports, ten cultivation realms, evidence-bound workflow coaching, optional aggregate snapshots, progress comparisons, and opt-in antagonists that challenge workflow patterns rather than the person.
- Added `/tutien classify` with independent Dao faction, affiliation, and technical-path axes; a cultivation-knowledge taxonomy linked to real kit skills; and seven deterministic, token-independent progression metrics.
- Added complete Simplified Chinese documentation (`docs/README.zh-CN.md`) alongside English and Vietnamese, with synchronized language navigation and npm package inclusion.

### Changed

- Refined `/tutien` with the cross-model namespace `tutien-coding-cultivation-v1`, calm `serene`/`spirited` narration, plain evidence beneath the lore, and reliable English/Vietnamese stop requests that restore the kit's normal writing style. Legacy `gentle`/`spicy` tone values remain compatible.
- Centralized skill distribution in `.vibekit/skills/skills-manifest.json`, keeping canonical skills, tool mirrors, installer registries, validator registries, package contents, documentation, and per-profile tests synchronized.
- Strengthened `/claim` with canonical redirect validation, HTTPS-only remote evidence, private-host and confusable-domain rejection, untrusted-content handling, explicit approval states, separate approval for integration-time execution, and a complete distribution checklist.
- Strengthened `/tutien` with one fail-closed policy state shared by rendering and persistence, idempotent event progression, boundary-aware path matching, metadata-only classification scope, and explicit authorization handling for legitimate dual-use security work.

### Security and privacy

- `/tutien` remains offline and read-only during analysis. Raw prompts, secrets, author names, email addresses, and commit subjects do not enter reports or snapshots; stored history uses salted digests and aggregate evidence.
- Ambiguous, unauthorized, or declared-stop classifications suppress scores, realms, villains, recommendations, and positive progression. The game evaluates workflow evidence (not a person's identity, worth, health, or wellbeing) and stays isolated from unrelated support or companion modes.
- `/claim` treats fetched pages as untrusted data and never runs remote installers, lifecycle scripts, or source-provided commands during research.

### Validation

- Expanded `/tutien` coverage to **133 deterministic, offline checks**, including adversarial privacy, token-integrity, policy-state, replay-idempotency, namespace-isolation, natural stop-request, and end-to-end approval-boundary cases.
- `pack-dry-run.mjs` now parses `npm pack --dry-run --json` and fails with the exact missing path when an on-disk skill file is absent from the package.
- Synchronized the release version to `0.5.0` in `package.json`, `.codex-plugin/plugin.json`, and both README badges.

## 0.4.2 - 2026-07-18

- Added a Grok Build (Grok CLI) surface across the kit: `.grok/rules/` (always-on, every `*.md` loaded), `.grok/skills/` (all 13 kit skills, user-invocable as `/<skill-name>`), `.grok/README.md`, and project-scoped `[permission]` deny rules in `.grok/config.toml` mirroring the kit's dangerous-command deny list; `config.example.toml` documents the user-level `~/.grok/config.toml` settings. Added a `grok` install/update profile to `mvck.mjs` (included in `all`) and registered Grok everywhere Claude/Cursor/Codex already were: `validate-kit.mjs`, npm package files, `backbone.yml` `agent_surfaces`, `AGENTS.md`, the AgentShield probe, both READMEs, `INSTALL.md`, `BACKBONE_REFERENCE.md`, `CONTEXT_TEMPLATE.md`, `FIRST_TIME_INIT.md`, and `vibekit-init`.
- Added `prompt-sharpener` skill (shared + Claude/Cursor/Codex/Grok mirrors), an English rewrite of a collected `sharpen` skill: `/prompt-sharpener <rough prompt>` diagnoses a raw prompt against a defect checklist (vague verbs, mixed tasks, missing success criteria, unbounded scope, missing output format), rebuilds it as a sharper prompt (`Objective` → `Context` → `Work Style` → `Tool Rules` → `Output Contract` → `Verification` → `Done Criteria`), prints it in one code block, then executes it in the same turn.
- Corrected the dangerous-command guardrails after a cross-tool documentation review. Removed the pipe-spanning `curl *|*sh` / `wget *|*sh` deny rules from `.claude/settings.json` and `.cursor/settings.json` - Claude Code evaluates each piped subcommand independently, so they never matched - in favor of denying bare shell interpreters (`sh`, `bash`, `zsh`, and their `-` stdin forms, which is what `curl ... | sh` actually executes), and fixed the `npx` rules to also cover the common leading `--yes`/`-y` forms.
- Added each tool's actual documented project-level permission mechanism, since only Claude Code and Cursor's Claude-schema file had one before: `.cursor/cli.json` with `Shell(...)` rules for Cursor CLI (the real mechanism Cursor reads; the Claude-schema `settings.json` is kept only as reference), experimental `.codex/rules/vibekit.rules` execution-policy rules for Codex (`forbidden` decisions with `match`/`not_match` fixtures, active once the project `.codex/` layer is trusted), and the `.grok/config.toml` rules above.
- `validate-kit` now lints deny lists for pipe-spanning patterns and missing leading `npx --yes`/`-y` coverage, and is profile-aware: per-surface files are required only when that surface is installed (the kit source repo still validates everything), so a `claude`-only or `grok`-only install passes its own validation; `test-install` runs an install+validate cycle for each single profile.
- `mvck update` treats `.cursor/cli.json` and `.grok/config.toml` as user-owned (seeded once, never overwritten). The AgentShield probe's suspicious-marker scan now skips lines inside permission `deny` arrays, so the kit's own deny rules no longer flag themselves as suspicious; allow/ask blocks are still scanned.
- Synced version to 0.4.2 in `package.json`, both README badges, and `.codex-plugin/plugin.json`.

## 0.4.1 - 2026-07-17

- Added a safe-delete guardrail across all three surfaces: new `.claude/rules/safe-delete.md` and `.cursor/rules/040-safe-delete.mdc` (always-on), a `### Safety` bullet in the `AGENTS.md` managed block for Codex, and a trash-first outcome in the `path-sensitive-shell-safety` skill (all mirrors). Agents prefer the recoverable `trash` command over `rm`, check `command -v trash` first, and recommend an install when missing (macOS 14+ built-in; older macOS `brew install trash`; Linux `sudo apt install trash-cli`; any OS with Node `npm i -g trash-cli`). `rm` was already deny-listed for Claude Code and Cursor in the kit settings.
- First-time init now asks two setup preferences and records them in `backbone.yml` `conventions.custom_rules`: use `trash` instead of `rm` (with availability detection and install hints), and a default coding level chosen from a 0-5 table with one-line descriptions. Mirrored in the `init-backbone.mjs --propose` interview output.
- `coding-level` skill (all mirrors): sessions now start from the `Default coding level: N` entry in `backbone.yml` when present; `/coding-level N` still overrides per session and can save a new default with approval. `CLAUDE-template.md` now lists `/coding-level` and the safe-delete rule.
- `mvck doctor` reports a new safe-delete check: whether the `trash` command is available, with the per-OS install hint when it is not.
- Fixed the npm package page rendering the Vietnamese README: moved `README.vi.md` to `docs/README.vi.md` so npm's readme detection always picks `README.md`.
- Added an "Install from npm" section to `README.md`, `docs/README.vi.md`, and `.vibekit/docs/INSTALL.md`: one-shot `npx --yes minimal-vibe-coding-kit@latest install <path>`, or `npm i -D minimal-vibe-coding-kit` followed by `npx mvck install .`, with a note that files in `node_modules/` stay inactive until `mvck install` copies them into the repo root.
- Switched README install/update/profile examples to the published npm package; the `github:` form and local `install.sh` remain documented as alternatives.
- Synced version to 0.4.1 in `package.json`, both README badges, and `.codex-plugin/plugin.json`; added an npm badge.

## 0.4.0 - 2026-07-16

- Trimmed the end-user install payload: `mvck install`/`update` no longer copy kit-maintainer files (`test-install.mjs`, `pack-dry-run.mjs`, `.vibekit/docs/RESEARCH_NOTES.md`, `.vibekit/docs/AUTORESEARCH_LEDGER.md`); `validate-kit` requires them only in the kit source repo.
- `mvck install`/`update` now reject unknown `--profile` values instead of silently installing shared files only.
- `install.sh` no longer misreads a leading flag as the target directory.
- Fixed stale pre-0.4 path references: `.codex-plugin/plugin.json` now points at `./.vibekit/skills/` (version synced to the kit), the AgentShield probe scans `.vibekit/skills`/`.claude/skills`/`.cursor/skills`, and autoresearch/agentshield skill docs use `.vibekit/skills` in editable-path examples.
- Added `parallel-analysis` to the AGENTS.md "Skills to prefer" list.
- Broadened CI PR path filters to cover `install.sh`, `install.ps1`, `.vibekit/init/**`, and `.vibekit/docs/**`.
- Rewrote `README.md` and `README.vi.md`: short Quick Start, end-user install topology, day-to-day guide, full commands/skills tables (now including `/vibe-finalize` and `parallel-analysis`), and an Advanced section; version badge synced to the package version.

- BREAKING: consolidated all kit-owned files into a single `.vibekit/` folder - `.vbkit-scripts/` -> `.vibekit/scripts/`, `.vbkit-commands/` -> `.vibekit/commands/`, `.vbkit-docs/` -> `.vibekit/docs/`, `skills/` -> `.vibekit/skills/`, and one-time onboarding files (`FIRST_TIME_INIT.md`, `FIRST_PROMPT.md`, `CLAUDE-template.md`, `PUSH_TO_GITHUB.md`) -> `.vibekit/init/`. User repos now get one kit folder plus the harness surfaces (`.claude/`, `.cursor/`, `.agents/`, `.codex/`, `.codex-plugin/`) and root entrypoints (`backbone.yml`, `AGENTS.md`, `CLAUDE.md`). `mvck install`/`update` print an advisory legacy-layout note (never auto-delete) when pre-0.4 paths are found.
- Added `parallel-analysis` skill (shared + Claude/Cursor/Codex mirrors): fan out 2-5 read-only analysis lanes via Cursor CLI Composer (recommended), Claude subagents, or Codex CLI, then merge and verify findings; first use asks for the provider/model once and persists it to `.vibekit/parallel-analysis.json`.

- Added `memento` skill (cross-session `MEMENTO.md` working memory) across shared, Claude, Codex, and Cursor surfaces.
- Added `coding-level` skill (explanation register 0=ELI5 … 5=expert peer, with per-level reference personas) across shared, Claude, Codex, and Cursor surfaces.
- Added safe updater: `mvck update` refreshes kit-owned files (skills, commands, rules, scripts, docs, agent mirrors), seeds user-owned files only when missing, refreshes managed blocks in place, backs up replaced files to `.vibekit/update-backup/<timestamp>/`, and supports `--dry-run`, `--json`, `--no-backup`, and `--profile`.
- Stamped installed kit version in `.vibekit/KIT_VERSION` on install/update; `mvck doctor` now reports it with the update command.
- Added update-behavior tests (stale-file refresh, new-skill backfill, user-file preservation, backup creation, non-kit target rejection).
- Hardened installer managed-block fallback when template markers are missing.
- Fixed `mvck init|validate|daily` delegation so flags are preserved when target is omitted.
- Added install/idempotency tests with temporary clean and existing repos.
- Added `mvck doctor` with optional `VIBE_REPORT.md` generation.
- Added dependency-free `backbone.yml` schema validation and `.vibekit/docs/backbone.schema.json`.
- Added a portable Node wrapper for the AgentShield probe.
- Added syntax checks, `npm test`, CI Node 18/20/22 matrix, and package dry-run verification.
- Added release safety docs and Dependabot config.
- Promoted `clearthought`, `sequential-thinking`, and `reviewing-4p-priorities` as native custom reasoning skills across shared, Claude, Codex, and Cursor surfaces.
- Added first-time convention discovery so init proposals include repo-specific naming, architecture, resource, localization, and generated-definition rules before approval.
- Added validation checks for mirrored skill-surface parity across shared, Claude, Cursor, and Codex paths.
- Hardened autoresearch guidance so experiment loops honor first-time init, logged baselines, metric extraction, and AgentShield review for agent-surface changes.

## 0.2.0

- Added one-command installer CLI: `mvck install <project>`.
- Added quick shell and PowerShell installers: `install.sh`, `install.ps1`.
- Added compact `backbone.yml` template and automatic backbone detection helper.
- Added clean first prompt and first-time init runbook.
- Added Claude, Cursor, and Codex support surfaces.
- Added shared skills for autoresearch coding, AgentShield security review, daily workflow curation, and kit init.
- Added AgentShield read-only repo probe.
- Added daily propose-only enhancement report.
- Added validation script and GitHub Actions validation workflow.
- Reduced root instruction boilerplate by moving details into docs and skills.
