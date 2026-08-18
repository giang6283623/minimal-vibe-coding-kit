# Cursor Codex controller recovery

Use this workflow when a Cursor-hosted Codex controller route fails preflight,
start, or reply. Diagnose without mutation first. A failed route is not
authorization to repair it.

## Safety contract

- Read-only discovery and bridge preflight may run without repair approval.
- Before any state-changing or paid action, show the exact action, target,
  expected state change, risk, rollback, and verification, then wait for an
  explicit answer in the parent conversation.
- Approval is action-specific and single-use. Approval to refresh a cache does
  not approve login, install, update, session start, or another provider call.
- Never edit, delete, replace, or base-normalize `models_cache.json`. The cache
  writer version must match the complete selected CLI version exactly.
- Never attach to or reuse the Cursor extension app-server.
- Never change the executable, cache, login, or host route while a controller
  session is open. Close the old state first and start a new session.

## 1. Freeze the route

Record the objective, host, controller, transport, worker route, authorization,
budget, and whether a controller state is already open. For this recovery case,
the expected route is usually:

- host: `cursor`;
- controller: `codex`;
- transport: `codex-cli` through the stateful bridge;
- worker route: selected independently;
- relay: `automatic-host-relay` or `sequential-host-relay` with
  `resume_controller: true`.

Do not create workers or a live controller session during diagnosis.

## 2. Run the read-only check

Run bridge preflight from the validated project root:

```bash
node .vibekit/skills/agent-control-center/scripts/codex-cli-controller-bridge.mjs \
  preflight /absolute/validated/project
```

An operator-set `MVCK_CODEX_BIN` remains the highest-priority route and fails
without fallback. Automatic Cursor discovery tries the active host-declared
`openai.chatgpt` extension, other bounded extension candidates, then PATH.

Record only the bounded receipt fields needed for the decision:

- `code`, `localAdapterStatus`, and `liveRouteStatus`;
- `routeSource`, CLI version, release channel, and route-binding digest when
  present;
- cache version and catalog digest when present;
- sanitized `candidateAttempts`;
- the propose-only `recoveryPlan`.

Do not treat `recoveryPlan` as approval. It is a safe proposal template only.

## 3. Choose a recovery branch

| Option | What it does | Cost | Risk | Recommended |
|---|---|---|---|---|
| Refresh selected Codex surface | User sends one bounded request through the selected Cursor Codex surface, then preflight runs again | May consume quota | The product may rewrite the same-user cache | Yes, for cache missing, stale, invalid, or version mismatch |
| Correct explicit route | Changes the exact `MVCK_CODEX_BIN` used for the next preflight | Local configuration only | Wrong path can select another installation | Only for an invalid user-selected path |
| Authenticate selected route | Starts authentication for the exact selected executable | Account and provider action | Changes login state and data boundary | Only for `codex-auth-unverified` |
| Update or replace route | Changes the CLI or extension installation | Install time and possible download | Changes executable identity and cache ownership | Only for missing capabilities, after source review |
| Stop | Leaves the route unavailable | No cost | Requested controller remains unavailable | Always safe |

Never offer a manual cache version bump as a recovery option. Never accept a
prerelease CLI as matching its base release.

## 4. Ask for approval

The parent must ask one concise question for one exact action. Include:

- the selected route and executable path;
- the current failure code;
- the exact action and target;
- whether the action may consume quota, install software, change login, rewrite
  local cache, or close controller state;
- rollback or stop behavior;
- the exact read-only command that verifies the result.

If a structured question tool is available, use it. Otherwise ask in the parent
conversation. Child workers never ask the user directly. If approval is absent,
stay plan-only or stop.

## 5. Apply only the approved action

Before applying a route, cache, login, or installation change:

1. stop worker dispatch;
2. identify any open controller state;
3. obtain separate approval to close that state;
4. close it without deleting or rewriting its private evidence;
5. perform only the approved action;
6. run a new preflight;
7. discard every earlier selection and route-binding receipt.

Starting a live controller session is a separate paid or quota-bearing action.
Ask again after preflight returns a usable catalog and the user selects a model
and reasoning effort.

## 6. Failure-specific handling

### Cache mismatch, missing, stale, invalid, or unsafe

Recommend a refresh through the selected Codex product surface while no
controller session is open. The user may perform the UI action. Then rerun
preflight. Do not edit the cache file, its `client_version`, or `fetched_at`.

### Unsupported reasoning effort

The bridge supports `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, and
`ultra`, but only offer efforts returned for the selected catalog model. Do not
invent an effort or normalize its name.

### Structured output schema failure

Use the bundled flat response schema. It requires all root fields and uses
neutral inactive values instead of `oneOf`. The bridge removes only neutral
inactive values before kind-specific validation. A conflicting non-neutral
field remains an error.

### Runtime drift on reply

Do not retry the old state. Stop dispatch, ask approval to close it, rerun
preflight, select again, and ask separate approval before starting a new live
session. Do not copy a session ID into the new route.

## 7. Report the result

Return the before and after failure codes, approved action, preflight receipt,
whether a new live request was approved, and remaining risks. Keep the route
`installed-unverified` until an authorized live request proves the explicit
session and response contract.
