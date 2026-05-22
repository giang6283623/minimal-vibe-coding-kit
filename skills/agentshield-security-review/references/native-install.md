# Native Claude Code and Codex Install Pattern

Keep one canonical skill and add thin harness adapters.

## Shared skill location

Recommended repo layout:

```text
skills/agentshield-security-review/SKILL.md
skills/agentshield-security-review/references/review-checklist.md
skills/agentshield-security-review/references/report-template.md
skills/agentshield-security-review/scripts/agentshield_repo_probe.py
commands/security-scan.md
.codex-plugin/plugin.json
.claude-plugin/plugin.json
```

## Claude Code command shim

Create `commands/security-scan.md` or `.claude/commands/security-scan.md`:

```markdown
---
description: Run an AgentShield-style security scan against agent, hook, MCP, permission, skill, command, Claude, and Codex surfaces.
agent: security-reviewer
subtask: true
---

# Security Scan

Run the shared `agentshield-security-review` skill against the current repo or the target path.

## Usage

`/security-scan [path] [--format text|json|markdown|html] [--min-severity low|medium|high|critical] [--fix]`

Prefer the deterministic scanner:

```bash
npx ecc-agentshield scan --path "${TARGET_PATH:-.}" --format text
```

If `--fix` is requested, summarize planned safe fixes first, apply only scanner-marked safe fixes, then re-run the scan.

Return grade, score, severity counts, active paths, critical/high findings, and remediation order.
```

## Codex plugin pointer

Use the repo-level Codex plugin manifest to point Codex at the same `skills/` directory. Exact schema may vary by Codex plugin version, so preserve the existing repo schema and ensure it references root skills rather than a copied skill body.

Example intent:

```json
{
  "name": "your-repo",
  "version": "0.1.0",
  "skills": "./skills",
  "mcp": "./.mcp.json"
}
```

## CI gate

Add a GitHub Actions job when you want agent config changes to fail builds:

```yaml
name: agent-security
on:
  pull_request:
    paths:
      - "CLAUDE.md"
      - "AGENTS.md"
      - ".claude/**"
      - ".codex/**"
      - ".codex-plugin/**"
      - ".claude-plugin/**"
      - ".agents/**"
      - "agents/**"
      - "skills/**"
      - "commands/**"
      - "hooks/**"
      - ".mcp.json"
      - "mcp-configs/**"

jobs:
  agentshield:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Run AgentShield
        run: npx ecc-agentshield scan --path . --format text --min-severity medium
```
