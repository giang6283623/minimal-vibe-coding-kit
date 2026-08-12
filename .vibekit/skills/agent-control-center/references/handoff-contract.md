# Handoff contract

Use bounded envelopes across native agent, MCP, CLI, SDK, or manual provider
boundaries. Omit fields that contain no useful value, but never omit scope,
authorization, acceptance, or stop conditions.

## Task envelope

Bind the complete workflow:

```yaml
version: 2
task_id: task-unique-id
objective: one observable outcome
controller: native
relay:
  mode: sequential-host-relay
  resume_controller: false
controller_route:
  provider: current
  transport: native
  model: provider-default
  reasoning_effort: provider-default
  selection_source: verified-single-route
worker_defaults:
  provider: current
  transport: host-sequential
  model: provider-default
  reasoning_effort: provider-default
  selection_source: verified-single-route
topology: sequential
repo_root: /absolute/validated/repo
scope:
  allowed_paths: []
  protected_paths: []
authorization:
  mutation: false
  external_actions: false
budget:
  max_workers: 1
  max_retries: 1
  timeout_ms: 600000
acceptance:
  commands: []
  artifacts: []
  human_gates: []
```

Validate the repository root before dispatch. Never use an unvalidated home,
filesystem root, unresolved environment variable, or symlinked broad path as a
mutable scope.

Bind `controller_route` and `worker_defaults` independently. Record
`selection_source` as `explicit-user`, `verified-single-route`, or
`verified-auto`. Never infer a worker route from the controller route. The
controller may choose worker responsibilities, but it may not replace the
approved worker provider, transport, model, or reasoning effort. A
per-work-order override must match an approved ready route or produce
`ask-user`. `automatic-host-relay` means the host forwards messages and
receipts; it never means the controller directly controls host-native workers.

## Work order

Give one worker one responsibility:

```yaml
work_id: work-unique-id
task_id: task-unique-id
role: bounded-role
executor_provider: current
executor_transport: host-sequential
requested_model: provider-default
requested_reasoning_effort: provider-default
read_only: true
paths: []
instructions: exact task-local instructions
expected_artifacts: []
validation: []
stop_conditions: []
allow_child_dispatch: false
```

The work order cannot widen the task envelope. The worker must stop when a
required path, permission, credential, model, or validation oracle is missing.
Child agents return `needs_user_input` through the host to the controller
instead of asking the end user directly. The controller returns `ask-user` when
the parent must obtain a user decision.

## Proof receipt

Require this evidence-oriented return:

```yaml
task_id: task-unique-id
work_id: work-unique-id
status: complete
issuer: authenticated-host-or-requested-not-attested
effective_runtime:
  provider: current
  model: provider-default
  attestation: requested-not-attested
scope_used: []
files_changed: []
commands_run: []
artifacts: []
evidence: []
residual_risks: []
needs_user_input: null
```

Allowed statuses are `complete`, `needs_user_input`, `blocked`, `failed`, and
`cancelled`. Evidence should name exact files, command results, digests, or
host-issued identifiers without including secrets. The controller must verify
material claims against the artifact or authenticated host boundary.

## Control decision

After verification, return exactly one decision:

- `accept`: the artifact satisfies acceptance;
- `retry`: issue a corrected work order within the original authority;
- `escalate`: switch topology or request an independent check;
- `ask-user`: a decision or new authority belongs to the user;
- `stop`: safety, budget, capability, or acceptance cannot be satisfied.

Bind a retry to the same task and a new work identifier. Do not edit a worker's
receipt to make it pass. Preserve disagreements and failed validation.

For `topology=proofline`, `accept` is invalid until the controller receives a
verified Keeper `SEAL_GRANTED` receipt. If `acceptance.human_gates` is not
empty, the trace must also contain the required Owner approval before that
seal. A `SEAL_PROPOSAL` does not satisfy this condition.

## Host-mediated controller loop

When the active host uses any external provider controller:

1. the host sends the task envelope to the verified controller route;
2. the controller returns one or more bounded work orders;
3. the host verifies every work order against the user-selected worker routes,
   then dispatches native workers or executes sequentially;
4. the host returns proof receipts to the same Codex task when resume is
   supported;
5. the controller verifies the evidence and returns the control decision;
6. the host presents any user decision in the parent conversation through its
   exposed structured-question tool when available;
7. the host returns the answer to the same controller session before further
   dispatch.

This is request-response coordination. It is not direct remote control of the
host UI.

## Complete examples and trace validation

Use [native-sequential.json](../examples/native-sequential.json) for one
coherent native sequential route. Use
[cursor-codex-cursor-workers.json](../examples/cursor-codex-cursor-workers.json)
for a Cursor host that relays to one Codex controller and dispatches two
Cursor-native workers. The provider model IDs in the fixtures are descriptive
placeholders; replace them with values from the verified live catalog.

Each example contains a version 2 task envelope, matching work orders, and a
complete public event trace. Validate an adapted trace before accepting it:

```bash
node .vibekit/skills/agent-control-center/scripts/validate-controller-contract.mjs \
  .vibekit/skills/agent-control-center/examples/cursor-codex-cursor-workers.json
```

The dependency-free validator rejects route mismatches, missing independent
route selection evidence, host decomposition before external-controller
handoff, controller authority violations, out-of-order receipts, invalid manual
relay bindings, and Proofline acceptance without a verified seal and required
Owner approval. It validates the supplied record; it does not authenticate a
provider, model, user, or host by itself.

## Manual handoff

When the controller transport is `manual`, derive relay mode `manual-handoff`.
When only interactive applications are ready, give the user the exact task
envelope or work order in a fenced block. Ask them to return the matching proof
receipt. Mark the route `manual`, keep secrets out, and do not claim automation
or model attestation that the host cannot prove.
