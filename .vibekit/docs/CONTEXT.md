# Project context

> Shared glossary and map for this repository (the kit source repo itself), so any
> agent (Claude, Cursor, Codex, OpenCode, Grok, Kimi) navigates it with less back-and-forth
> and re-pitches (`/wait-what`) use the same vocabulary in every language.
> Keep it current and terse - definitions, not prose.

## Domain glossary

One row per term. Use the en term as the canonical identifier in code and config;
use the vi / zh column only in prose replies in that language. Terms without a
translation stay in English in every language.

| Term (en) | vi | zh | Meaning |
| --- | --- | --- | --- |
| backbone | backbone | backbone | The project contract in `backbone.yml`: conventions, commands, paths, policy. Always the first read. |
| skill | skill | 技能 | A repeatable agent workflow in `.vibekit/skills/<name>/SKILL.md`, mirrored to each surface. |
| surface | surface | 代理平台 | One supported agent integration: Claude (`.claude/`), Cursor (`.cursor/`), Codex and OpenCode (`.agents/`), Grok (`.grok/`), Kimi (`.kimi-code/`). |
| canonical copy | bản canonical | 规范副本 | The single source of truth for a skill under `.vibekit/skills/`; every surface copy must match it byte for byte. |
| mirror | mirror | 镜像 | A per-surface copy of a canonical skill; parity is enforced by the validator. |
| manifest | manifest | 清单 | `.vibekit/skills/skills-manifest.json`: the central registry the installer and validator derive skill and mirror lists from. |
| managed block | managed block | 托管块 | The `<!-- BEGIN/END: minimal-vibe-coding-kit -->` region the installer owns inside user files; content outside it is never overwritten. |
| validator | validator | 校验器 | `node .vibekit/scripts/validate-kit.mjs .`: the dependency-free check that gates every change (`npm test`). |
| AgentShield probe | AgentShield probe | AgentShield 探测 | `npm run security:probe`: read-only security inventory of agent surfaces; required after agent-surface edits. |
| user-invoked skill | skill do người dùng gọi | 用户触发技能 | A skill with `disable-model-invocation: true`; only the user may trigger it (for example `/claim`, `/wait-what`). |
| re-pitch | trình bày lại | 重新讲解 | The `/wait-what` repair: restate the previous message with the missing premise, in the user's language, with no new work. |
| coding level | coding level | 讲解级别 | The explanation register 0-5 set by `/coding-level N`; changes detail, never model quality or safety. |

## Key areas

- Entry point(s): `bin/mvck.js`, `bin/vibe-kit.js` (npm CLIs), `install.sh` / `install.ps1`.
- Core domain logic: `.vibekit/scripts/` (installer `mvck.mjs`, validator `validate-kit.mjs`, doctor, probe).
- Configuration: `backbone.yml`, `.vibekit/skills/skills-manifest.json`, `package.json` `files`.
- Tests: `npm test` (syntax, install, validate, per-skill contracts under `test/`).
- Build/deploy: `npm run pack:dry-run`; the user publishes to npm manually.

## Conventions in use

- Naming: kebab-case skill names, lowercase files and directories.
- Architecture / folder layout: canonical skills plus per-surface mirrors; registries derive from the manifest, never from hardcoded lists.
- Shared resources: skill and mirror registries come from `.vibekit/skills/skills-manifest.json`.
- User-facing copy / localization: `README.md` plus `docs/README.<locale>.md` (vi, zh-CN, ja, ko, de, bg); skill counts are pinned by the validator.

## External systems & integrations

- npm registry (package `minimal-vibe-coding-kit`); GitHub Actions (`.github/workflows/vibekit-validate.yml`); optional `ecc-agentshield` scanner (pinned, never auto-run).
- Credentials/secrets location: none stored in-repo; `.env*` and secret-like paths are protected in `backbone.yml`.

## Gotchas

- Adding a skill touches more than the skill: manifest entry, five mirrors, `package.json` `files` (Claude and Cursor dirs are listed one by one), validator count strings ("All N skills" in seven languages, "N user-invoked skills"), README tables and mindmaps, INSTALL.md, CLAUDE-template.md, CHANGELOG.
- The validator pins localized README sentences verbatim; edit the README and the validator string together or `npm test` fails.
- English-only writing standards (ASD-STE100 word lists) apply only when the reply language is English; Vietnamese and Chinese replies use the plain-language register plus this glossary instead.

---

Related: `backbone.yml` (project map, commands, protected paths) and
`.vibekit/docs/templates/CONTEXT_TEMPLATE.md` (the blank template end-user projects scaffold from).
`backbone.yml` `project.context` points at this file.
