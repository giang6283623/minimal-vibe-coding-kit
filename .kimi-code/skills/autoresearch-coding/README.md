# Autoresearch Coding

Metric-driven improvement loop for AI coding agents.

Example:

```text
/autoresearch-coding goal: improve API latency; metric command: npm run bench; direction: lower; editable paths: src/api src/lib; protected paths: .env* migrations; budget: 5
```

Run a reviewed metric without a shell string:

```text
python3 .vibekit/skills/autoresearch-coding/scripts/run_logged.py --log .autoresearch/logs/experiment-1.log --timeout 600 -- npm run bench
```

Declare repetitions, aggregation, tolerance, minimum delta, and metric exit-code semantics before the baseline. Treat benchmark scripts and expected outputs as protected oracle assets.

For this kit:

```text
/autoresearch-coding goal: improve the kit; metric command: node .vibekit/scripts/validate-kit.mjs .; direction: higher; editable paths: .vibekit/docs .vibekit/scripts .vibekit/skills .vibekit/commands .claude .cursor .agents .codex-plugin; budget: 3
```
