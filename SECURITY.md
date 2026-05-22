# Security Policy

## Supported versions

Security fixes target the latest published release and the `main` branch.

## Reporting a vulnerability

Please report suspected vulnerabilities through GitHub private vulnerability reporting when available, or open a minimal issue that does not include exploit details or secrets.

Include:

- affected version or commit;
- impacted file or command;
- reproduction steps that do not expose credentials;
- expected security boundary.

## Agent-surface safety

This kit treats agent instructions, skills, hooks, MCP config, installer scripts, and CI as security-sensitive surfaces. Before release, run:

```bash
npm test
npm run security:probe
npm run pack:dry-run
```

Do not publish changes that introduce unrestricted shell permissions, hidden network execution, silent hook failures, secret printing, or prompt-injection bypass language.
