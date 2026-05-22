# Autoresearch Coding

Metric-driven improvement loop for AI coding agents.

Example:

```text
/autoresearch-coding goal: improve API latency; metric command: npm run bench; direction: lower; editable paths: src/api src/lib; protected paths: .env* migrations; budget: 5
```

For this kit:

```text
/autoresearch-coding goal: improve the kit; metric command: node scripts/validate-kit.mjs .; direction: higher; editable paths: docs scripts skills commands .claude .cursor .agents .codex-plugin; budget: 3
```
