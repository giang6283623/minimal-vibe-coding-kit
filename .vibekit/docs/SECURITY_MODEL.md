# Security model

## Agent surfaces

Review these before merging changes:

- `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`
- `.claude/**`, `.cursor/**`, `.agents/**`, `.grok/**`, `.kimi-code/**`, `.codex/**`, `.codex-plugin/**`
- `.vibekit/skills/**`, `.vibekit/commands/**`, `.vibekit/scripts/**`, `hooks/**`
- `.mcp.json`, `mcp.json`, `mcp-configs/**`
- installer scripts and CI workflows

## AgentShield workflow

Read-only probe:

```bash
node .vibekit/scripts/agentshield-probe.mjs .
```

Full scanner when available:

```bash
npx ecc-agentshield@1.4.0 scan --path . --format text --min-severity medium
```

If the package is not already installed, request approval before fetching and executing this
exact version. Otherwise use the repository probe plus the manual review checklist.

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
