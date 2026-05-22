# Security Review Report Template

Use this structure for final reports.

## Summary

- Scan mode:
- Grade/score:
- Repo root:
- Harnesses found:
- Overall risk:

## Commands run

```bash
# commands here
```

## Active surfaces found

| Surface | Paths | Runtime confidence |
|---|---|---|
| Claude |  |  |
| Codex |  |  |
| Shared skills |  |  |
| Hooks |  |  |
| MCP |  |  |
| CI/plugin |  |  |

## Critical/high findings

| Severity | Confidence | Path | Issue | Why it matters | Fix | Auto-fix safe? |
|---|---|---|---|---|---|---|

## Medium/low findings

Group by theme: permissions, hooks, MCP, prompts, skills, docs/examples.

## Remediation order

1. Remove or rotate exposed secrets.
2. Restrict shell/tool permissions.
3. Pin or sandbox MCP/package execution.
4. Harden hooks and quote/sanitize variables.
5. Add CI gate.
6. Remove duplicate divergent Claude/Codex skill copies.
7. Re-run scan and confirm grade improvement.

## Native integration status

- Claude Code:
- Codex:
- Shared skill source:
- Drift risks:
