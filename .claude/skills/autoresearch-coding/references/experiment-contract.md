# Experiment Contract

Use this format before starting an autoresearch coding loop.

```text
Goal: <what should improve>
Metric command: <command that produces the metric>
Metric extraction: <regex, line prefix, JSON key, or human-readable rule>
Direction: <lower|higher>
Editable paths: <paths Claude may modify>
Protected paths: <paths Claude must not modify>
Budget: <number of experiments>
Timeout: <duration per experiment, e.g. 10m>
Simplification rule: <when equal metric can still be kept>
Crash policy: <rerun once after trivial fix, otherwise discard>
```

## Defaults

- Budget: 3 experiments.
- Timeout: 10m per experiment.
- Protected paths: `.env*`, secrets, credentials, migrations, generated files, lockfiles, deployment config, infra config, and any file outside the editable scope.
- Crash policy: fix one trivial patch-caused bug, rerun once, then discard.
- Simplification rule: keep equal metric only if code is clearly simpler, smaller, safer, or easier to maintain.

## Metric examples

```text
Metric command: pytest -q
Metric extraction: tests passed and runtime from pytest summary
Direction: higher for passed tests, lower for runtime if pass count is equal
```

```text
Metric command: npm run bench -- --json
Metric extraction: JSON key p95_ms
Direction: lower
```

```text
Metric command: cargo test --all
Metric extraction: success/failure only
Direction: higher, where pass=1 and fail=0
```

## Ambiguous metrics

If the command returns multiple relevant values, optimize in this order unless the user says otherwise:

1. Correctness pass/fail.
2. User-specified primary metric.
3. Runtime or latency.
4. Memory or resource use.
5. Simplicity of the kept code.
