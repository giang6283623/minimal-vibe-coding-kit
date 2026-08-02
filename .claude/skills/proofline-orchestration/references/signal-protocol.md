# Proofline signal protocol

Signals are typed coordination messages. They do not create authority.

## Required envelope

Every signal records:

```text
signal_id: stable unique id
sequence: monotonic positive integer per task
type: one allowlisted signal
task_id: frozen task identifier
contract_version: exact version or digest
contract_digest: canonical contract digest
input_digest: authoritative input snapshot digest
sender_role: Keeper | Wayfinder | Countervoice | Maker
sender_actor: authenticated runtime identity; required for a final seal
sender_authenticated: true | false
target_role: named role or Owner
claim: one falsifiable statement
evidence: file references, command output, primary sources, or explicit proof gap
requested_action: one bounded next action
scope_effect: none or exact proposed scope change
issued_at: timestamp from the coordinating runtime
expires_at: timestamp or single-use
dedupe_key: task + contract + type + claim + evidence digest
status: open | accepted | refuted | risk-owned | escalated | withdrawn
acknowledged_at: recipient acknowledgement timestamp or unresolved
```

If a signal proposes a scope, oracle, budget, or authority change, it creates a new contract version and may require renewed approval.

The coordinating runtime must recompute the dedupe key and reject unknown types, duplicate ids, duplicate dedupe keys, non-monotonic sequence values, expired signals, signals bound to another contract or input digest, and signals sent after the contract is closed. Require acknowledgement by the exact target actor before treating a requested transition as complete. A role label is not a cryptographic identity; where sender authentication is unavailable, record that limitation and keep the workflow non-final.

## Sender and transition matrix

| Signal | Allowed sender | Allowed effect |
| --- | --- | --- |
| `FRAME_CHALLENGE` | Countervoice | Open a falsifiable challenge |
| `NEED_SIGNAL` | Keeper, Wayfinder, Countervoice, Maker | Request one prerequisite without granting it |
| `HOLD_NOTICE` | Keeper, Wayfinder, Countervoice, Maker | Freeze the named lane or task |
| `ASSEMBLY_CALL` | Keeper, Wayfinder, Countervoice | Request bounded deliberation |
| `PROOF_RETURN` | Maker, Wayfinder | Submit evidence without self-acceptance |
| `SEAL_PROPOSAL` | Wayfinder | Request seal evaluation |
| `SEAL_GRANTED` | Keeper | Record an already valid Owner gate and verifier result |
| `SEAL_DENIED` | Keeper, Countervoice | Refuse sealing with a falsifiable reason |

Only the named recipient may acknowledge or dispose a signal. A Maker cannot grant a seal, a Wayfinder cannot mark its own challenge `risk-owned`, and no agent may synthesize Owner approval.

## Owner gate

Consequential approval is a separate data object, never a role signal:

```text
grant_id: stable unique id
grantor_identity: authenticated Owner identity or unresolved
identity_evidence_digest: digest of the authentication evidence
task_id: exact frozen task id
contract_version: exact frozen version
action: exact approved operation
target: exact approved artifact or system
scope: exact mutable boundary
contract_digest: frozen contract digest
input_digest: frozen input digest
artifact_digest: exact artifact digest when available
tree_digest: exact verified tree digest when available
issued_at: trusted timestamp
expires_at: trusted timestamp or single-use
use_limit: positive integer
uses_recorded: non-negative integer
revoked_at: timestamp or unresolved
```

If identity cannot be authenticated or any binding is stale, the grant cannot authorize mutation or sealing.

## Allowlisted signals

### `FRAME_CHALLENGE`

Meaning: the premise, question, architecture, or proposed foundation may be wrong.

Required proof: contradictory evidence, an untested assumption, or a concrete failure mode. The recipient must revise, refute, escalate, or leave the signal open.

### `NEED_SIGNAL`

Meaning: a named prerequisite, artifact, decision, permission, or dependency is missing.

Required proof: identify what is missing, why it blocks the frozen done signal, who can supply it, and whether safe partial work remains.

### `HOLD_NOTICE`

Meaning: work cannot continue safely within current authority, budget, scope, or verifier state.

Required proof: last successful checkpoint, exact blocker, attempted safe alternatives, and restart condition. A hold is not a failure if it prevents unauthorized or unverified work.

### `ASSEMBLY_CALL`

Meaning: a joint deliberation is needed because evidence conflicts, two valid options remain, or a consequential choice belongs to the Owner.

Required proof: disputed question, options, known evidence, decision owner, deadline or expiry if relevant, and the default safe action while waiting.

### `PROOF_RETURN`

Meaning: a bounded artifact is handed back with reproducible evidence.

Required proof: use [proof-return-schema.md](proof-return-schema.md). A self-report without the listed evidence is incomplete.

### `SEAL_PROPOSAL`

Meaning: the Wayfinder asserts that integrated work satisfies the frozen acceptance contract.

Required proof: accepted Proof Returns, combined verifier output, disposition of every material challenge, residual risks, and required human gates.

### `SEAL_GRANTED`

Meaning: the Keeper records that the frozen acceptance contract and required gates are satisfied.

This is a record, not an authority expansion. For consequential work, the Owner's exact approval must be attached.

### `SEAL_DENIED`

Meaning: sealing is refused because a falsifiable acceptance condition remains unmet.

Required proof: failed condition, evidence, owner for the next action, and the smallest safe route to reconsideration.

## Anti-noise rules

- Deduplicate signals by task, contract version, type, claim, and evidence digest.
- Set a maximum number of open signals and deliberation rounds.
- Do not repeat an unchanged signal to simulate progress.
- Do not convert uncertainty into a blocker unless it affects the done signal or safety.
- Do not use `ASSEMBLY_CALL` for routine bugs that one owner and one verifier can resolve.
- Preserve withdrawn and refuted signals in the ledger so the final handback shows how dissent was handled.
- On no progress, expiry, or replay uncertainty, emit `HOLD_NOTICE`, preserve verified partial results, and default to no seal.
- Close the ledger with a non-sensitive tombstone containing task id, final contract digest, closing sequence, seal state, and close time. Reject all later signals unless the Owner opens a new contract version.
