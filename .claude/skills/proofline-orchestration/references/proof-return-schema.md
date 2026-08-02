# Proof Return schema

Every Maker artifact and every integration artifact returns this evidence envelope.

```text
task_id: frozen task id
contract_version: exact version or digest
contract_digest: canonical contract digest
artifact_id: stable artifact id
actor: runtime actor or session id
role: Maker | Wayfinder
context_provenance: session/context id, parent or fork id, prompt/input digests, provider/model, effective tool scopes
input_snapshot: immutable manifest of scoped repository state, oracle/config versions, and external source versions when available
freshness_checked_at: timestamp from the coordinating runtime
scope_assigned: exact files, systems, or semantic resources
scope_used: exact files, systems, or semantic resources actually touched
artifact: path, diff, report, result id, or other inspectable output
artifact_digest: canonical digest of the exact artifact or diff
tree_digest: canonical digest of the exact tree that was verified
changes: concise behavior-level summary
enforcement_manifest: actual filesystem, semantic, credential, network, API, and verifier boundaries
budget_used: wall time, tokens, tool calls, cost, agents, concurrency, retries, and remaining verification reserve
validation:
  command_or_oracle: argv, working directory, exit code, toolchain versions, and named evidence rule
  owner: verifier owner
  result: passed | failed | partial | not-run
  evidence: exact output reference and output digest
  oracle_digest: protected oracle/config digest
evidence_policy: classification, allowed readers, retention/deletion rule, references and redacted excerpts only; no secret values
oracle_integrity: protected | changed-with-approval | unresolved
cleanup_status: clean | quarantined | failed | not-applicable
rollback: artifact or explicit not-applicable reason
signals_open: signal ids still unresolved
residual_risk: bounded remaining risk
integration_lease: holder, exact scope, checkpoint, fencing epoch/token, expiry, revocation, and successor rule when role is Wayfinder
status: ready-for-review | accepted | rejected | blocked | partial
```

## Acceptance rules

A Proof Return is incomplete when:

- `scope_used` is broader than `scope_assigned` without a revised contract;
- contract or input digest is stale, missing, or mismatched;
- a mutable lane reports prompt-only enforcement as isolation;
- budget, freshness, or integration lease information is missing when applicable;
- input manifests omit available scoped index, worktree, untracked, oracle, config, or external-source version evidence;
- validation is only the actor's confidence;
- verifier identity is the actor or integration owner when independent verification is required;
- artifact, tree, oracle, command-output, or toolchain binding is absent or changed after validation;
- an oracle changed inside Maker or merge-owner scope without separate approval;
- failed or not-run checks are hidden;
- cleanup, rollback, open signals, or residual risk are omitted;
- evidence contains credentials, tokens, private keys, or unnecessary sensitive payloads instead of references;
- evidence classification, access, retention, deletion, or quarantine state is missing;
- the artifact cannot be inspected or reproduced.

The Wayfinder may aggregate multiple Proof Returns but must preserve their individual actor, input, evidence, and status lineage. Aggregation never turns a rejected or partial result into an accepted one.

## Minimal final ledger

```text
seal_state: proposed | granted | denied | not-eligible
accepted_artifacts: []
rejected_or_partial_artifacts: []
combined_verification: exact evidence
combined_tree_digest: exact verified tree digest
challenge_dispositions: []
open_signals: []
residual_risk: []
irreducible_limits: []
review_provenance: independent | self-review | unavailable
authority_gate: exact grant id or not-required
protected_action_gateway: external-enforced | policy-simulator | unavailable
next_authority: role or Owner
```
