# Experiment contract

Required fields:

- Goal and observable success condition.
- Metric command as argv and its trust provenance.
- Metric extraction rule, direction, minimum meaningful delta, accepted exit codes, and tie policy.
- Repetitions, aggregation, tolerance, warmups, and deterministic seed when applicable.
- Editable paths.
- Protected paths, including metric and oracle assets.
- Budget and per-run timeout.
- Required environment, tool versions, and external dependencies.

The agent must print the contract before editing. If any field is inferred, label it `inferred`.

Editable and protected paths must be disjoint. Review the metric command before execution, and do not use a command with deployment, migration, network, lifecycle, hook, or other external side effects without explicit authorization.

Record a baseline fingerprint for dirty-state work and the digests of protected oracle assets. If the metric or oracle changes, close the current comparison and take a new baseline under a revised contract.
