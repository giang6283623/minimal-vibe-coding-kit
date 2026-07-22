# `/tutien` dev test harness

The live skill is canonical under `.vibekit/skills/tutien/` and mirrored to Claude, Cursor, Codex, and Grok. This directory contains only source-repository tests and synthetic fixtures. It is intentionally excluded from the npm package.

Run all 158 deterministic, offline checks from the repository root:

```bash
npm run test:tutien
```

Run one suite directly:

```bash
node test/tutien/scripts/test-analyzer.mjs
node test/tutien/scripts/test-render.mjs
node test/tutien/scripts/test-villains.mjs
node test/tutien/scripts/test-snapshot.mjs
node test/tutien/scripts/test-classify.mjs
node test/tutien/scripts/test-story.mjs
node test/tutien/scripts/test-adversarial.mjs
node test/tutien/scripts/test-e2e.mjs
```

The suites cover analyzer determinism and redaction, scoring and bilingual evidence-ledger rendering, adaptive response contracts, bounded villain behavior, aggregate snapshot comparison, cultivation classification, the Vietnamese/English/Chinese living chronicle ledger, adversarial privacy cases, and the end-to-end runner. Fixtures are synthetic and deliberately include fake credential-shaped strings to verify redaction.

These are unit, integration, and subprocess-level runner checks. They include bounded project-profile detection, response-brief privacy, explicit ledger output, and on/off suppression. Creative chapter quality remains an agent responsibility; the deterministic suite validates its evidence packet, privacy boundary, filenames, ordering, and continuity transaction.
