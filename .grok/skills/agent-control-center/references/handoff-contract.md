# Handoff contract

Use bounded envelopes across native agent, MCP, CLI, SDK, or manual provider
boundaries. Omit fields that contain no useful value, but never omit scope,
authorization, acceptance, or stop conditions.

## Task envelope

Bind the complete workflow:

```yaml
version: 1
task_id: task-unique-id
objective: one observable outcome
controller: native
controller_provider: current
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

## Work order

Give one worker one responsibility:

```yaml
work_id: work-unique-id
task_id: task-unique-id
role: bounded-role
executor: current
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
Child agents return `needs_user_input` to the controller instead of asking the
end user directly.

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

## Host-mediated controller loop

When the active host uses any external provider controller:

1. the host sends the task envelope to the verified controller route;
2. the controller returns one or more bounded work orders;
3. the host dispatches native workers or executes sequentially;
4. the host returns proof receipts to the same Codex task when resume is
   supported;
5. the controller verifies the evidence and returns the control decision;
6. the host presents any user decision in the parent conversation.

This is request-response coordination. It is not direct remote control of the
host UI.

## Manual handoff

When only interactive applications are ready, give the user the exact task
envelope or work order in a fenced block. Ask them to return the matching proof
receipt. Mark the route `manual`, keep secrets out, and do not claim automation
or model attestation that the host cannot prove.
