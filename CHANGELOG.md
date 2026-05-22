# Changelog

## Unreleased

- Hardened installer managed-block fallback when template markers are missing.
- Fixed `mvck init|validate|daily` delegation so flags are preserved when target is omitted.
- Added install/idempotency tests with temporary clean and existing repos.
- Added `mvck doctor` with optional `VIBE_REPORT.md` generation.
- Added dependency-free `backbone.yml` schema validation and `docs/backbone.schema.json`.
- Added a portable Node wrapper for the AgentShield probe.
- Added syntax checks, `npm test`, CI Node 18/20/22 matrix, and package dry-run verification.
- Added release safety docs and Dependabot config.
- Promoted `clearthought`, `sequential-thinking`, and `reviewing-4p-priorities` as native custom reasoning skills across shared, Claude, Codex, and Cursor surfaces.
- Added first-time convention discovery so init proposals include repo-specific naming, architecture, resource, localization, and generated-definition rules before approval.

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
