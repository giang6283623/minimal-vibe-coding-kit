# Controller modes

The controller owns task decomposition, dispatch decisions, verification, and
final acceptance. The host owns the tools, process, permissions, and provider
session. A worker owns only its assigned work order.

## Native

Keep the active provider as controller. Use only capabilities exposed by the
current host. If native child agents are absent or cannot enforce the required
boundary, execute sequentially in the parent.

Use Native when the user invokes `controller=native`, when the task is small,
or when no cross-provider route is both ready and useful.

## Fixed provider

Use `controller=<provider-id>` when the user explicitly selects a provider from
a verified route inventory. Read `provider-selection.md` and resolve the exact
transport, model, and reasoning effort separately. Provider selection does not
change the active host, permission boundary, or topology.

### Codex

Use Codex as controller through one of these transports:

1. a native Codex session;
2. the bundled stateful Codex CLI bridge described in
   `codex-cli-bridge.md`;
3. verified Codex MCP request-response tools exposed by the active host;
4. another documented adapter with enforceable scope and receipts;
5. a manual bounded handoff to an interactive Codex task.

For MCP, the client host calls Codex and receives controller output. Plain MCP
does not give Codex a reverse channel to invoke arbitrary client tools or take
over an agent window. The host must translate Codex work orders into native
dispatches and return receipts.

For the bundled CLI route, run preflight before selection. It checks the local
CLI-advertised resume surface and rejects CLI and model-cache version drift, but
keeps the live route `installed-unverified` until an approved request succeeds.
For a Cursor host, the bridge applies the explicit override, active
host-declared `openai.chatgpt` registry, bounded installed extension, and PATH
priority documented in `codex-cli-bridge.md`. Local extension metadata is not
publisher attestation. A failed explicit override stops; automatic candidates
may fall through only after a bounded redacted failure record.
Use the returned local catalog to ask for model and reasoning effort in the
parent through its exact structured question tool when available. Treat that
selection record as host-declared unless separately authenticated. The bridge captures one session ID,
disables Codex multi-agent execution on start and resume, and accepts only
schema-bound controller output. Retain its private state path only for the
current workflow. Do not put credentials, account data, or unrelated task
content in that state.

When a Cursor host selects Codex, treat the Cursor application, Cursor CLI, and
Cursor SDK as independent routes. A Codex controller bridge does not require
Cursor CLI or Cursor SDK. If either Cursor adapter fails authentication, quota,
or capability checks, keep it unavailable. Do not invoke `cursor-agent`,
install an SDK, start login, or enable billing as a fallback.

Do not attach to the Codex app-server owned by the Cursor extension. The bridge
starts and resumes only its own child processes from the selected executable,
and binds every turn to the same route and executable content digest.

If no Codex route is ready, return `ask-user` with a verified alternate
provider, `controller=native`, plan-only, or stop. Never switch the controller
silently.

## Auto

Build the live capability inventory first. Select a controller only after its
route satisfies the task's safety, context, tool, isolation, budget, and
verification floors. Prefer Native when another controller offers no material
benefit.

Ask before selecting a controller that changes provider billing, data
exposure, permission scope, or mutation authority. Automatic selection never
grants authority. Follow `provider-selection.md` for the same live inventory
and consent rules used by fixed-provider selection.

## Manual transport

Manual is a transport, not a controller. Use it when the requested controller
is available only in an interactive application. Give the user one bounded
task envelope to transfer and accept only a matching proof receipt in return.
Do not describe a manual handoff as automated orchestration.

## Controller transfer

Allow at most one transfer per task:

1. pause new dispatches;
2. collect or cancel outstanding work;
3. record completed artifacts and unresolved risks;
4. obtain approval when the transfer changes provider, billing, permissions,
   or mutation authority;
5. issue a new task envelope bound to the new controller;
6. invalidate unused work orders from the old controller.

Never allow controllers to delegate control to each other recursively. A
controller may request workers from another host, but those workers do not
become controllers.

## Relationship to orchestration preference

Keep these axes independent:

- controller: Native, Auto, or one registered provider identifier;
- provider preference: Default, Auto, or Custom from
  `.vibekit/docs/ORCHESTRATION_MODES.md`;
- topology: plan-only, sequential, countercheck, parallel analysis, verified
  graph, or Proofline.

A controller choice does not authorize multi-agent work. A provider preference
does not transfer control. A topology does not select a provider.
