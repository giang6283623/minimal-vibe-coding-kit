# Contributing

Thank you for improving Minimal Vibe Coding Kit. Keep changes small, reviewable, and safe for repos that already have their own agent instructions.

## Development checks

Run the full local check before opening a pull request:

```bash
npm test
npm run security:probe
npm run pack:dry-run
```

## Change guidelines

- Preserve existing project files during install; prefer managed blocks for shared instructions.
- Keep root instructions concise and move long procedures into `skills/` or `.vbkit-docs/`.
- Do not add package lifecycle scripts, hooks, MCP servers, migrations, or deploy steps that run during install.
- Update `.vbkit-docs/backbone.schema.json` and `.vbkit-scripts/validate-kit.mjs` together when `backbone.yml` changes.
- Add an install/idempotency test when changing `.vbkit-scripts/mvck.mjs`.

## Pull request checklist

- Validation passes on Node 18, 20, and 22.
- AgentShield probe passes or any warning is explained.
- `npm run pack:dry-run` contains only intended release files.
- Agent-surface changes are easy to audit.
