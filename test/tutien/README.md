# `/tutien` dev test harness

The live skill is canonical under `.vibekit/skills/tutien/` and mirrored to Claude, Cursor, Codex, and Grok. This directory contains only source-repository tests and synthetic fixtures. It is intentionally excluded from the npm package.

Run all 76 deterministic, offline checks from the repository root:

```bash
npm run test:tutien
```

Run one suite directly:

```bash
node test/tutien/scripts/test-analyzer.mjs
node test/tutien/scripts/test-render.mjs
node test/tutien/scripts/test-villains.mjs
node test/tutien/scripts/test-snapshot.mjs
```

The suites cover analyzer determinism and redaction, scoring and bilingual rendering, bounded villain behavior, and aggregate snapshot comparison. Fixtures are synthetic and deliberately include fake credential-shaped strings to verify redaction.

These are unit and integration checks for the engine modules. They do not currently prove an end-to-end slash-command runner for `preview`, `analyze`, `compare`, or `explain`; that remaining release gap is tracked by the current review.
