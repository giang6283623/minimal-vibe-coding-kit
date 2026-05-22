# Security model

## Agent surfaces

Review these before merging changes:

- `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`
- `.claude/**`, `.cursor/**`, `.agents/**`, `.codex-plugin/**`
- `skills/**`, `commands/**`, `hooks/**`
- `.mcp.json`, `mcp.json`, `mcp-configs/**`
- installer scripts and CI workflows

## AgentShield workflow

Read-only probe:

```bash
python skills/agentshield-security-review/scripts/agentshield_repo_probe.py .
```

Full scanner when available:

```bash
npx ecc-agentshield scan --path . --format text --min-severity medium
```

## Findings labels

- `scanner-backed`: comes from AgentShield or deterministic probe output.
- `manual-confirmed`: verified by reading active repo files.
- `manual-suspected`: plausible risk that needs maintainer confirmation.

## Do not do these silently

- Run untrusted hooks or MCP servers.
- Execute install scripts from remote sources.
- Deploy or run migrations.
- Rotate or print secrets.
- Relax tool permissions.
- Enable wildcard shell execution.
