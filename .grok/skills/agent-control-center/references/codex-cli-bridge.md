# Codex CLI controller bridge

Use the bundled bridge when an external Codex controller must remain in one
explicit CLI session while the active host dispatches workers. This is a
host-side adapter. It does not give Codex direct access to host-native agents.

## Readiness

Run the non-mutating preflight first:

```bash
node .vibekit/skills/agent-control-center/scripts/codex-cli-controller-bridge.mjs \
  preflight /absolute/validated/repo
```

Preflight verifies the local executable identity, CLI-advertised command
surface, login-status output, and a fresh same-user model cache written by the
same CLI version. A passing preflight reports `localAdapterStatus: ready`, but
the overall route remains `installed-unverified` until an authorized controller
request creates a valid explicit session. The cache is local selection data,
not an authenticated provider receipt. A CLI and cache version mismatch also
remains `installed-unverified`. Do not repair, delete, or rewrite a user's
cache, CLI, login, or configuration automatically.

Use the returned model catalog to select the controller model and reasoning
effort. Ask through the active parent's exact structured question tool, such as
`AskUserTool`, `AskUserQuestion`, or `request_user_input`, when it is exposed.
Otherwise ask one concise plain-text question. Bind the answer to
`catalogDigest` and `verifiedAt` in the start request. The question record is
host-declared unless the parent runtime supplies separate authenticated
evidence. The bridge reports model and effort as `requested-not-attested`
because Codex CLI accepts the request but does not authenticate the effective
model in its JSONL events.

## Start and reply

Send one JSON object on stdin to `start`:

```bash
node .vibekit/skills/agent-control-center/scripts/codex-cli-controller-bridge.mjs \
  start /absolute/validated/repo < start-request.json
```

The request contains `version: 1`, the complete version 2 task envelope, a
selection receipt, and an optional bounded `timeout_ms`. The bridge starts
`codex exec --json`, applies the controller response schema, disables Codex
multi-agent execution, uses a private read-only working directory outside the
repository, captures exactly one `thread_id`, and returns `state_path` plus the
controller response.

The scope uses exact repository-relative paths. Expand and review any project
globs before creating the envelope. The bridge rejects glob tokens and any
existing symlink component, then rechecks controller work-order and receipt
paths against the frozen exact scope.

Dispatch only the returned approved work orders. Return worker receipts,
Proofline signals, Owner approvals, user answers, or bounded host signals with:

```bash
node .vibekit/skills/agent-control-center/scripts/codex-cli-controller-bridge.mjs \
  reply /private/generated/state.json < exchange.json
```

Each exchange binds `task_id`, the next sequence, a unique `exchange_id`, and
one or more events. The bridge resumes the explicit captured session. It never uses `--last`.
Receipt payloads are forwarded unchanged to the controller, but
only receipt digests, status, and hashed acceptance identifiers persist in
private state. Every receipt must match the complete Proof Receipt contract,
issued worker route, scope, expected artifacts, and required validation. An
`accept` response must bind every receipt digest, every receipt must be
`complete`, and the frozen acceptance evidence must be present.

Proofline signals and Owner approvals remain untrusted relay data inside this
adapter. They are forwarded to the controller but never set local acceptance
authority. For `topology=proofline` or a task with Owner gates, the bridge
rejects `accept`; the host must run the protected Keeper or Owner verifier and
complete acceptance outside this bridge. This prevents caller JSON from
forging a seal or approval.

When the controller returns `ask-user`, the host parent asks the user, then
returns a matching `user-answer` event to the same state path. This completes
the two-way control loop without letting child agents contact the user.

## Cancel and close

The host can interrupt an active bridge process with its normal cancellation
signal. On POSIX hosts, the bridge terminates the controller process group so
spawned descendants do not outlive a timeout or cancellation. For an idle
workflow, run `cancel <state-path>` or `close <state-path>`. The private
state directory uses mode 0700, the state file uses mode 0600, and state expires
after one hour. Retain it only as long as the current workflow or audit needs
it.

## Provider and model coverage

The session failure is transport-specific, not model-specific. Any controller
model invoked as a one-shot prompt without a task envelope, explicit session
identifier, reply path, and receipt loop has the same control break. All Codex
controller models use this bridge contract.

Claude, Cursor, OpenCode, Grok, Kimi, MCP, SDK, and API controller routes need
an equivalent provider-specific adapter with `preflight`, `start`, `reply`,
`cancel`, and `close` behavior. Until that adapter proves explicit session
continuity, cancellation, bounded output, route binding, and receipt replay
protection, classify the route as `installed-unverified` or `unavailable`.
Do not reuse this Codex adapter or claim a provider route is ready from a model
name alone.

## Evidence boundary

The fake CLI tests prove local wrapper behavior without network or quota use.
They do not prove the installed CLI, account, provider service, model identity,
or a paid live request. A live route becomes `ready` only after local preflight
passes and an approved live request proves the required session and response
contract. Keep model, effort, selection-tool, and provider identity claims at
their actual attestation level.
