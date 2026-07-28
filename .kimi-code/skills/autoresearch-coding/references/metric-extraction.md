# Metric extraction

Prefer a numeric metric from the command output. If the command only returns pass/fail, score it as:

- pass: 1
- fail: 0

When warnings matter, report pass/fail plus warning count. Do not hide failures behind a single score.
