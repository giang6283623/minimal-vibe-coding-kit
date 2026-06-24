---
name: agentshield-security-review
description: repository-native security review workflow for Claude Code and Codex projects using the AgentShield concept. Use when auditing or hardening agent configuration, skills, prompts, hooks, MCP servers, permissions, slash commands, Codex plugin files, Claude plugin files, AGENTS.md, CLAUDE.md, or repository-level AI coding-agent surfaces. Prefer this skill before merging changes to .claude, .codex, .codex-plugin, .claude-plugin, .agents, skills, .vbkit-commands, .vbkit-scripts, hooks, mcp configs, or generated code that touches agent execution.
---

# AgentShield Security Review

Use this skill to run an AgentShield-style review that is native to both Claude Code and Codex repositories. Treat the repo root as the source of truth, then inspect agent surfaces before normal code review.

## Core rule

Do not invent findings. Prefer deterministic scanner output when available, then add reviewer judgment separately. Clearly label each finding as `scanner-backed`, `manual-confirmed`, or `manual-suspected`.

## Standard workflow

1. Identify the repo root and active harness surfaces.
2. Run `node .vbkit-scripts/agentshield-probe.mjs .` to inventory Claude, Codex, shared skills, hooks, MCP, commands, and repo instruction files.
3. If Node/npm is available, run AgentShield from the repo root:
   ```bash
   npx ecc-agentshield scan --path . --format text
   ```
4. If JSON is needed for CI or automation, run:
   ```bash
   npx ecc-agentshield scan --path . --format json
   ```
5. If safe auto-fixes are requested, first summarize the proposed edits, then run:
   ```bash
   npx ecc-agentshield scan --path . --fix
   ```
6. Re-run the scan after fixes and report before/after score, severity counts, and changed files.
7. If AgentShield is unavailable, perform the fallback manual review in `references/review-checklist.md`.

## Harness-native layout

Use a shared root skill where possible:

- `skills/agentshield-security-review/SKILL.md` is the canonical workflow.
- Claude Code may add a slash-command shim in `.vbkit-commands/security-scan.md` or `.claude/commands/security-scan.md`.
- Codex should consume the same root `skills/` directory through `.codex-plugin/plugin.json` or the repo's native skill/plugin mechanism.
- Do not duplicate divergent Claude and Codex skill bodies. Duplication causes drift.

See `references/native-install.md` for copy-ready Claude and Codex snippets.

## What to inspect

Prioritize runtime-active files over examples and docs:

1. `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`
2. `.claude/settings.json`, `.claude/settings.local.json`, `.claude/agents/*.md`, `.claude/commands/*.md`
3. `.codex/config.toml`, `.codex/`, `.codex-plugin/plugin.json`
4. `.agents/`, `agents/`, `skills/`, `.vbkit-commands/`, `.vbkit-scripts/`, `hooks/`
5. `.mcp.json`, `mcp.json`, `mcp-configs/*.json`
6. installer scripts, CI workflows, package scripts, and generated plugin manifests

## Output contract

Return a concise report with:

- Security grade/score if AgentShield provides one.
- Commands run and whether the scan was `npx`, local, CI, or fallback-manual.
- Active harness surfaces found.
- Critical/high findings with exact paths, severity, confidence, exploit impact, and fix.
- Medium/low findings grouped separately.
- Safe auto-fix candidates versus manual-only changes.
- Claude-native and Codex-native installation notes when the repo lacks one of them.
- Final remediation order.

Use `references/report-template.md` for the preferred report format.

## Safety constraints

- Never print full secrets. Show only the file path and key name or a redacted prefix/suffix.
- Do not run untrusted hook scripts, MCP server commands, package scripts, or installer scripts just to inspect them.
- Do not apply `--fix` without first stating the planned edit types.
- Treat wildcard shell permissions, unpinned `npx`, shell-running MCP servers, prompt-injection instructions, and silent hook failures as high-risk until proven otherwise.
