# Security model

## Two review layers

The kit keeps two security-review domains separate:

- `threat-model-security-review` covers application source, APIs, authentication,
  authorization, parsers, storage, network access, trust boundaries, and code diffs.
- `agentshield-security-review` covers agent instructions, skills, permissions, hooks,
  MCP servers, commands, plugin manifests, installers, and other agent execution surfaces.

When a change crosses both domains, run both workflows and label the source of each finding.
AgentShield probe output is not an application vulnerability finding.

## Application security workflow

Invoke `threat-model-security-review` for a read-only repository, component, diff, or
vulnerability-claim review. It builds a repository-specific threat model, records explicit
coverage, traces attacker-controlled sources through controls to sensitive sinks, and assigns
an evidence status to every candidate.

Remediation requires separate write authority. Fix one accepted finding at a time, add focused
regression evidence, and revalidate the original attack path plus legitimate behavior.

This is a dependency-free kit workflow built on standard threat-model and validation concepts.
It does not install, invoke, or bundle an external scanner.

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
