# Result Ledger

Keep `results.tsv` local and uncommitted unless the user explicitly asks to commit it.

Required columns:

```tsv
commit	metric_value	direction	status	seconds	log_path	description
```

Status values:

- `keep`: improved metric or equal metric with simpler code.
- `discard`: valid run but not worth keeping.
- `crash`: command failed, timed out, or produced no metric.

## Row rules

- `commit`: short git hash for the experiment commit; use `baseline` for the first row if no commit exists.
- `metric_value`: numeric value when available; use `1` for pass and `0` for fail if the metric is binary.
- `direction`: `lower` or `higher`.
- `seconds`: elapsed wall-clock seconds rounded to one decimal when available.
- `log_path`: path to the full log file.
- `description`: one short phrase with no tab characters.

## Keep/discard comparison

For `lower`, improvement means `candidate < best`.
For `higher`, improvement means `candidate > best`.

When values are equal, keep only if the patch removes complexity, removes code, reduces dependencies, improves safety, or clarifies architecture without increasing risk.

## Git hygiene

Before resetting a discarded experiment, confirm the current HEAD is the experiment commit and the working tree contains only experiment changes. Never reset across user work.
