# Result ledger

Use `results.tsv` with this header:

```text
commit	metric_value	direction	status	seconds	log_path	description
```

Status values:

- `keep`
- `discard`
- `crash`

Keep verbose command output in `.autoresearch/logs/`.

Ledger and log safety:

- Keep `results.tsv` inside the project root and logs inside `.autoresearch/logs/`.
- Refuse symlinked ledger or log paths.
- Use owner-only permissions and an atomic, locked append.
- Reject tabs, newlines, control characters, non-finite numbers, invalid statuses, and oversized fields instead of silently corrupting a row.
- Never write secrets, credentials, environment dumps, or raw provider output.
- A row describes one completed measurement aggregate. Keep individual repetitions and variance in its referenced log.
- `discard` and `crash` rows remain evidence; do not delete or rewrite them.
