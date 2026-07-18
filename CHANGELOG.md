# Changelog

## Unreleased

- Corrected the dangerous-command guardrails after a cross-tool documentation review. `.claude/settings.json` and `.cursor/settings.json`: removed the pipe-spanning `curl *|*sh` / `wget *|*sh` deny rules — Claude Code evaluates each piped subcommand independently, so they never matched — in favor of denying bare shell interpreters (`sh`, `bash`, `zsh`, and their `-` stdin forms, which is what `curl ... | sh` actually executes), and fixed the `npx` rules to also cover the common leading `--yes`/`-y` forms. Added each tool's documented project-level enforcement: `.cursor/cli.json` with `Shell(...)` permission rules for Cursor CLI (the Claude-schema `settings.json` is not a documented Cursor mechanism and is kept only as reference), experimental `.codex/rules/vibekit.rules` execution-policy rules for Codex (`forbidden` decisions with `match`/`not_match` fixtures; active once the project `.codex/` layer is trusted), and project-scoped `[permission]` deny rules in `.grok/config.toml` (Grok project configs support permission rules; `config.example.toml` now documents only user-level `permission_mode`). `validate-kit` lints deny lists for pipe-spanning patterns and missing leading `npx --yes`/`-y` coverage, and is now profile-aware: per-surface files are required only when that surface is installed (the kit source repo still validates everything), `agent_surfaces` path checks downgrade to warnings on profile-scoped installs, and `test-install` runs an install+validate cycle for each single profile. `mvck update` treats `.cursor/cli.json` and `.grok/config.toml` as user-owned (seed-only, never overwritten). Grok's `security.md` rule now invokes `/agentshield-security-review` directly (the `/security-scan` command does not exist on the Grok surface). Registered Grok in the `package.json` description/keywords, `BACKBONE_REFERENCE.md`, `CONTEXT_TEMPLATE.md`, `FIRST_TIME_INIT.md`, and the `vibekit-init` description and profile hint. The AgentShield probe's suspicious-marker scan now skips lines inside permission `deny` arrays (all mirrors), so the kit's own deny rules no longer trigger `npx -y` false positives; allow/ask blocks are still scanned.
- Added a Grok Build (Grok CLI) surface: new `.grok/` directory with always-on rules (`vibe-core.md`, `security.md`, `safe-delete.md` — Grok loads every `*.md` in `.grok/rules/`), all 13 kit skills mirrored to `.grok/skills/` (user-invocable as `/<skill-name>` slash commands), a `.grok/README.md`, and a `.grok/config.example.toml` documenting the user-level `~/.grok/config.toml` deny-rule setup that mirrors the kit's `.claude/settings.json` dangerous-command deny list (Grok reads permission config from the user-level file only, like Codex). Grok picks up the kit's `AGENTS.md` managed block natively. Added a `grok` install/update profile to `mvck.mjs` (included in `all`), registered `.grok` in `validate-kit.mjs` (required files, skill mirrors, reasoning-skill resources), npm package files, `backbone.yml` `agent_surfaces`, the `AGENTS.md` AgentShield trigger list, the AgentShield probe surfaces, and both READMEs plus `INSTALL.md`.
- Added `prompt-sharpener` skill (shared + Claude/Cursor/Codex mirrors), an English rewrite of a collected `sharpen` skill: `/prompt-sharpener <rough prompt>` diagnoses the raw prompt against a defect checklist (vague verbs, mixed tasks, missing success criteria, unbounded scope, missing output format), rebuilds it as a sharper prompt (`Objective` → `Context` → `Work Style` → `Tool Rules` → `Output Contract` → `Verification` → `Done Criteria`), prints it in one code block, then executes it in the same turn. Coding tasks get a scope lock and default validation from `backbone.yml`; large decompositions can hand off to `sequential-thinking`/`clearthought`. Registered in installer/validator skill lists, npm package files, both READMEs, `INSTALL.md`, and the `CLAUDE.md` template; the source file's foreign response-prefix section was dropped.

## 0.4.1 — 2026-07-17

- Added a safe-delete guardrail across all three surfaces: new `.claude/rules/safe-delete.md` and `.cursor/rules/040-safe-delete.mdc` (always-on), a `### Safety` bullet in the `AGENTS.md` managed block for Codex, and a trash-first outcome in the `path-sensitive-shell-safety` skill (all mirrors). Agents prefer the recoverable `trash` command over `rm`, check `command -v trash` first, and recommend an install when missing (macOS 14+ built-in; older macOS `brew install trash`; Linux `sudo apt install trash-cli`; any OS with Node `npm i -g trash-cli`). `rm` was already deny-listed for Claude Code and Cursor in the kit settings.
- First-time init now asks two setup preferences and records them in `backbone.yml` `conventions.custom_rules`: use `trash` instead of `rm` (with availability detection and install hints), and a default coding level chosen from a 0–5 table with one-line descriptions. Mirrored in the `init-backbone.mjs --propose` interview output.
- `coding-level` skill (all mirrors): sessions now start from the `Default coding level: N` entry in `backbone.yml` when present; `/coding-level N` still overrides per session and can save a new default with approval. `CLAUDE-template.md` now lists `/coding-level` and the safe-delete rule.
- `mvck doctor` reports a new safe-delete check: whether the `trash` command is available, with the per-OS install hint when it is not.
- Fixed the npm package page rendering the Vietnamese README: moved `README.vi.md` to `docs/README.vi.md` so npm's readme detection always picks `README.md`.
- Added an "Install from npm" section to `README.md`, `docs/README.vi.md`, and `.vibekit/docs/INSTALL.md`: one-shot `npx --yes minimal-vibe-coding-kit@latest install <path>`, or `npm i -D minimal-vibe-coding-kit` followed by `npx mvck install .`, with a note that files in `node_modules/` stay inactive until `mvck install` copies them into the repo root.
- Switched README install/update/profile examples to the published npm package; the `github:` form and local `install.sh` remain documented as alternatives.
- Synced version to 0.4.1 in `package.json`, both README badges, and `.codex-plugin/plugin.json`; added an npm badge.

## 0.4.0 — 2026-07-16

- Trimmed the end-user install payload: `mvck install`/`update` no longer copy kit-maintainer files (`test-install.mjs`, `pack-dry-run.mjs`, `.vibekit/docs/RESEARCH_NOTES.md`, `.vibekit/docs/AUTORESEARCH_LEDGER.md`); `validate-kit` requires them only in the kit source repo.
- `mvck install`/`update` now reject unknown `--profile` values instead of silently installing shared files only.
- `install.sh` no longer misreads a leading flag as the target directory.
- Fixed stale pre-0.4 path references: `.codex-plugin/plugin.json` now points at `./.vibekit/skills/` (version synced to the kit), the AgentShield probe scans `.vibekit/skills`/`.claude/skills`/`.cursor/skills`, and autoresearch/agentshield skill docs use `.vibekit/skills` in editable-path examples.
- Added `parallel-analysis` to the AGENTS.md "Skills to prefer" list.
- Broadened CI PR path filters to cover `install.sh`, `install.ps1`, `.vibekit/init/**`, and `.vibekit/docs/**`.
- Rewrote `README.md` and `README.vi.md`: short Quick Start, end-user install topology, day-to-day guide, full commands/skills tables (now including `/vibe-finalize` and `parallel-analysis`), and an Advanced section; version badge synced to the package version.

- BREAKING: consolidated all kit-owned files into a single `.vibekit/` folder — `.vbkit-scripts/` -> `.vibekit/scripts/`, `.vbkit-commands/` -> `.vibekit/commands/`, `.vbkit-docs/` -> `.vibekit/docs/`, `skills/` -> `.vibekit/skills/`, and one-time onboarding files (`FIRST_TIME_INIT.md`, `FIRST_PROMPT.md`, `CLAUDE-template.md`, `PUSH_TO_GITHUB.md`) -> `.vibekit/init/`. User repos now get one kit folder plus the harness surfaces (`.claude/`, `.cursor/`, `.agents/`, `.codex/`, `.codex-plugin/`) and root entrypoints (`backbone.yml`, `AGENTS.md`, `CLAUDE.md`). `mvck install`/`update` print an advisory legacy-layout note (never auto-delete) when pre-0.4 paths are found.
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
