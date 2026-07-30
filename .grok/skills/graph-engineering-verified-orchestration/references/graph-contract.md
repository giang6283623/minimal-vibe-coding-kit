# Verified orchestration graph contract

Use this contract for both plan-only and execute modes.

## 1. Graph header

```yaml
goal: One measurable final outcome
done_signal: Command, invariant, evidence set, or acceptance condition
graph_version: Human-readable label
graph_digest: Canonical digest of the complete contract, oracle, targets, and payload
execute_grant: absent | exact affirmative authority
authoritative_inputs:
  - Trusted source or repository path
input_snapshot: Hashes, versions, timestamps, or immutable locators
allowed_scope:
  read: []
  write: []
  semantic_resources: []
protected_scope: []
mode: plan-only | execute
merge_owner: One named agent or person
merge_scope: []
human_gates:
  - approver: Named person or authorized role
    artifact_digest: Exact content digest
    target: Exact system, path, audience, or recipient
    action: Exact consequential operation
    input_snapshot: Current input digest
    timing: Immediately before action
    expires_at: Timestamp or single-use
budgets:
  concurrency: unresolved
  tokens: unresolved
  time_seconds: unresolved
  retries_per_node: unresolved
  cost: unresolved | not_applicable
  verification_reserve_percent: unresolved
dynamic_discovery:
  max_nodes: unresolved | not_applicable | positive integer
  max_rounds: unresolved | not_applicable | positive integer
  deduplication_key: unresolved | not_applicable | stable identity
rollback:
  owner: One named agent or person
  reversible: true | false
  artifact: Patch, backup, or tested inverse operation
  trigger: Exact condition
  rehearsal: required | not_required
  mitigation_if_irreversible: Explicitly not a rollback
stop_conditions: []
```

Use visible environment-derived limits. A budget is a maximum, not a target. `unresolved` blocks execute mode; `not_applicable` needs a reason.

## 2. Node ledger

| Field | Requirement |
| --- | --- |
| ID | Stable, short identifier. |
| Responsibility | One bounded outcome. |
| Inputs | Exact files, sources, values, or upstream artifacts. |
| Output artifact | Named, inspectable result another node can consume. |
| Read scope | Paths and external systems the node may inspect. |
| Write scope | Exclusive paths and external state the node may mutate. |
| Semantic scope | Keys, IDs, namespaces, schemas, or invariants the node owns. |
| Risk | R0/R1/R2, advisory impact, and blast radius. |
| Verifier | Objective command, invariant, schema, or evidence rule. |
| Verifier owner | Orchestrator, separate verifier, or named human. |
| Verifier effects | Trust source, read/write/semantic scope, risk, timeout, cleanup, and rollback. |
| Input snapshot | Exact graph/input/environment version checked. |
| Timeout | Maximum node duration. |
| Retry policy | Retry-safe conditions and maximum attempts. |
| Cleanup | Quarantine/restoration proof after reject, timeout, or cancellation. |
| Rollback | Owner, artifact, trigger, and rehearsal requirement. |
| Failure policy | Stop graph, continue independent work, or return partial result. |
| Status | blocked, ready, running, rejected, or accepted. |

### Risk tiers

- **R0 - read-only:** analysis, inventory, or evidence collection. Require an evidence rule.
- **R1 - local reversible:** scoped edits with deterministic validation and recoverable rollback. Add integration checks when outputs interact.
- **R2 - consequential:** destructive, production, external-message, secret, migration, permission, or hard-to-recover changes. Require explicit authority and a human gate.

Track advisory impact separately: read-only work can still drive a consequential security, production, medical, legal, or financial decision. Upgrade a node when uncertain; do not downgrade merely because a verifier exists. Large blast radius requires a pilot and human gate even when each edit is individually R1.

## 3. Edge ledger

| From | To | Consumed artifact | Why B cannot start |
| --- | --- | --- | --- |
| A | B | Exact artifact from A | Concrete consumption reason |

Apply the false-edge test:

> If B can produce the same valid output without seeing A's output, remove the edge.

Shared subject matter, preferred ordering, or the same final deadline does not create a dependency.

## 4. State-isolation ledger

For each pair of ready mutable nodes, compare:

- files and directories;
- git index, branch, and working tree;
- schema keys, identifiers, registries, and global uniqueness constraints;
- generated output and build caches;
- temporary paths and test ports;
- database rows and schemas;
- APIs, queues, buckets, and remote resources;
- credentials, quotas, locks, and rate limits.

If scopes overlap, choose one:

1. serialize the nodes;
2. partition ownership more narrowly;
3. use an explicitly approved isolated environment;
4. switch to plan-only.

Do not assume separate context windows isolate shared state. Concurrent R1 work requires tool-enforced filesystem, API, and credential allowlists; prompt-only scope declarations do not count. If enforcement is unavailable, serialize R1 work under the main owner or remain plan-only. Every R2 action, serial or concurrent, requires enforceable least-privilege target, tool, and credential boundaries; a human gate does not compensate for over-broad containment.

Preflight dirty worktrees and other user changes; preserve them explicitly. Give concurrent tests separate cache/temp resources or serialize them.

## 5. Verification ladder

Use the minimum required rung and add higher rungs as risk increases:

1. format or schema validation;
2. deterministic unit or static checks;
3. integration or end-to-end checks;
4. comparison with primary sources or known invariants;
5. independent adversarial review;
6. human acceptance for consequential results.

Snapshot and protect the verification oracle (tests, schemas, fixtures, expected snapshots, commands, and verifier configuration) outside implementer write scope. An oracle change is a separate approved node, changes the graph digest, and invalidates dependent results.

For R1/R2, the verifier owner must not be the actor that produced or merged the artifact. A deterministic harness-run check may own verification when its protected oracle remains outside every implementer and merge scope. Give nontrivial verifiers their own authority, read/write/semantic scopes, risk, timeout, cleanup, and rollback; executable checks are code and require a trust review. Fresh context is useful for review but does not create model, training-data, tool, or source independence. Prefer different evidence paths and objective signals over reviewer count.

For research and cited recommendations:

- prefer primary evidence and record recency/version boundaries;
- deduplicate sources that share one underlying provenance;
- never cite an unvisited or inaccessible source as verified;
- store exact source locators and test citation entailment;
- separate observed evidence, inference, and recommendation;
- protect confidential query text and respect quotation limits;
- return coverage gaps instead of padding a requested source count.

## 6. Benefit and critical path

Estimate:

```text
T_sequential = sum(node durations with equivalent verification/integration)
T_graph = longest dependency path
          + scheduling overhead
          + queue/tool bottlenecks
          + merge overhead
          + verification overhead
expected_gain = T_sequential - T_graph
```

Do not compare unequal quality obligations. Do not fan out when `expected_gain` is negligible, negative, or too uncertain to justify extra cost and failure modes. Re-estimate after each wave because discovered work and bottlenecks can change the critical path.

## 7. Failure semantics

Define before execution:

- **Idempotency:** Can a node safely run again?
- **Retry:** Which failures are transient, and how many attempts are allowed?
- **Timeout:** What artifact or cleanup is valid after interruption?
- **Cancellation:** What happens to siblings when one required node fails?
- **Cleanup:** How is rejected or interrupted mutable state quarantined, restored, and proven clean?
- **Partial result:** Can accepted independent artifacts still be useful?
- **No progress:** Which repeated state stops the loop?
- **Dynamic discovery:** Which bounded loop may add nodes, its max nodes/rounds, and its deduplication key?
- **Cycles:** Reject accidental cycles; model intentional iteration as a bounded loop.

Never retry permission denials, failed human gates, deterministic verifier failures, or unsafe state conflicts without changing the plan.

Freeze the approved graph digest. A change to nodes, edges, scopes, risk, budgets, oracle, target, payload, or stop conditions invalidates prior execution approval when approval was required.

Plan approval and execution authority are separate. A request to design, plan, analyze, or explain does not authorize a mutable node.

## 8. Node result envelope

```yaml
node: ID
status: accepted | rejected | blocked
artifact: Path, diff, evidence set, or structured result
graph_version: Approved graph identifier
graph_digest: Approved canonical contract digest
input_snapshot: Exact input/environment version
scope_used:
  read: []
  write: []
  semantic_resources: []
verification:
  command_or_rule: Exact check
  executed_by: Orchestrator, verifier, or human
  result: pass | fail | not-run
evidence: []
rollback_artifact: Path or procedure
reversible: true | false
cleanup_status: clean | quarantined | failed | not_applicable
residual_risks: []
retry_count: 0
```

For multi-round or cross-session work, extend the envelope with append-only
lineage and a bounded context projection:

```yaml
lineage:
  result_id: Stable unique result identity
  run_id: Authoring execution identity
  artifact_digest: Exact output digest
  producer: Named agent, harness, or person
  derived_from_results: []
  source_locators: []
  evidence_kind: observed | inference | mixed
  evaluation_id: Stable evaluator decision identity
  rubric_digest: Protected evaluator rubric digest
  supersedes: []
context_projection:
  seed_ids: []
  allowed_relation_types: []
  maximum_hops: Positive integer
  token_or_byte_cap: Positive bounded limit
  source_graph_digest: Exact canonical source digest
  projection_digest: Exact serialized projection digest
```

Lineage relations record provenance and history. They do not become scheduling
edges unless a downstream node consumes the named artifact. A context
projection may reduce working evidence, but it must not omit authority, scopes,
gates, budgets, verifier contracts, conflicts, or known uncertainty.

The merge owner accepts only artifacts whose required verifier passed and whose cleanup state is safe. The merge owner may edit only its declared scope; conflict edits require re-verification. After merging, run final uniqueness, semantic-invariant, and graph-level integration checks.

For irreversible R2 actions, set `reversible: false`, provide the exact preview, minimize or canary the scope, record acknowledgement of irreversibility, and place a single-use human gate immediately before the action. A recovery or compensating mitigation is not rollback.

## 9. Plan-only fallback

Return a graph plan without dispatching nodes when any of these holds:

- authorization or a required approval is missing;
- affirmative execute/change intent is absent for mutable work;
- write scopes cannot be isolated;
- concurrent R1 scopes or any R2 action cannot be contained with the required enforceable boundaries;
- semantic resource ownership or input freshness cannot be proved;
- the work touches protected or consequential state without a human gate;
- no meaningful objective verifier exists;
- the graph contains an unresolved cycle;
- expected benefit does not exceed orchestration overhead;
- budgets, visible runtime limits, rollback, or stop conditions are unresolved;
- the runtime lacks required dispatch, accounting, cancellation, or isolation controls.
