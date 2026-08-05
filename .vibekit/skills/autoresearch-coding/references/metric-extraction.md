# Metric extraction

Prefer a numeric metric from an explicit, stable output field. Record the extraction pattern before the baseline and reject missing, duplicate, malformed, non-finite, or unit-mismatched values.

If the command only returns pass/fail, score it as:

- pass: 1
- fail: 0

Declare which exit codes are measurements. For example, a test failure may be a valid score of 0, while a missing executable, timeout, signal, malformed output, or unavailable dependency is a crash. Do not turn infrastructure failure into a numeric improvement.

For deterministic metrics, use one measured run. For noisy metrics, use at least three measured runs after any declared warmups, retain all values, compare the declared aggregate (median by default), and report range or another declared variance measure. Improvements smaller than the contract's tolerance or minimum meaningful delta are ties.

When warnings matter, report pass/fail plus warning count. Do not hide failures behind a single score, average incompatible units, select only the best repetition, or compare results from changed metric or oracle assets.
