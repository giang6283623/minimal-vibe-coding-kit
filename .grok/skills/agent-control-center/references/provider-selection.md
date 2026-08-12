# Provider selection and setup

Select controller and worker settings from live evidence. Keep role ownership,
provider, and model choices independent, while binding relay mode to the
selected controller transport and verified host capabilities.

## Evidence order

Use this order for each route:

1. Inspect capabilities exposed by the active host.
2. Identify a local binary with its own non-mutating version or help output.
   Do not map a generic command name such as `agent` to a provider without that
   identity evidence.
3. Use a non-mutating authentication status or current authenticated model
   catalog when the route supports one. Never print credentials.
4. When setup or version guidance is needed, fetch the current official
   provider documentation. Use primary provider sources only. Do not copy a
   model name, version, install command, or reasoning option from memory, cached
   prose, a search snippet, or an unofficial tutorial.
5. Classify the exact transport with the capability contract. Documentation can
   prove a supported procedure, but only the live route can become `ready`.

Registered provider identifiers are `current`, `codex`, `claude`, `cursor`,
`opencode`, `grok`, and `kimi`. Extend the manifest and deterministic routing
helpers before persisting another identifier. A provider may expose several
separate transports.

## Parent-only questions

Ask selection questions only in the active parent conversation. Prefer the
runtime's currently exposed structured question mechanism, such as
`AskUserQuestion` or `request_user_input` when that exact tool is available.
Common tool labels are examples, not assumptions. Never claim or call a tool
that the host does not expose. Batch no more than three short questions per
structured call. If no structured tool is available, ask one concise
plain-text question at a time. Child agents return `needs_user_input` and
never question the user directly.

Ask only when a value is unresolved, unverified, or has materially different
cost, data, permission, or quality consequences. Preserve an explicit verified
user choice. When only one ready route satisfies the task and no material
choice remains, use it and report why no question was needed.

Resolve these values in order:

1. **Controller provider.** Show two or three verified ready providers at a
   time, with one recommendation based on the task. Include the native provider
   when ready. A free-form answer may name another registered provider, but it
   must pass inventory checks before selection.
2. **Controller transport.** If the provider has more than one ready route,
   distinguish application, CLI, SDK, API, MCP, and manual routes. State
   billing and data boundaries that differ.
3. **Controller model.** Fetch a fresh authenticated catalog for the selected
   route. Offer `provider-default` plus two verified exact model IDs when
   useful, with one recommendation based on the controller role. Revalidate
   free-form IDs against the same catalog. Ask for reasoning effort only when
   that route attests supported values for the selected model.
4. **Worker provider and transport.** For a topology with workers, show the
   verified host-native worker route first, then up to two ready alternatives,
   with one recommendation based on the worker role. Distinguish native agents,
   CLI, SDK, API, MCP, and sequential execution. State isolation, billing,
   data, and tool-boundary differences.
5. **Worker model.** Fetch a fresh authenticated catalog for the selected
   worker route. Offer `provider-default` plus two verified exact model IDs when
   useful, with one recommendation based on the assigned worker scope. Resolve
   a default for all workers or explicit per-role or per-lane assignments. Ask
   for worker reasoning effort only when supported and attested.
6. **Relay mode.** Derive `manual-handoff` when the selected controller
   transport is `manual`; do not present it as a second independent choice. For
   every non-manual controller transport, offer only modes supported by the
   controller and worker pair: `automatic-host-relay` when the host can resume
   the controller and return worker receipts, or `sequential-host-relay` when
   the host must execute bounded work without child agents. Recommend automatic
   relay only when its resume, cancel, scope, and receipt requirements are
   verified. Never bind `manual-handoff` to a CLI, SDK, API, MCP, application
   bridge, or native transport.
7. **Consent.** Confirm any change in provider billing, data exposure,
   permission scope, or mutation authority before the first controller or
   worker request.

Never infer the worker provider, transport, model, or reasoning effort from the
controller selection. Selecting `controller=codex` does not select Codex
workers. Selecting Cursor workers does not transfer controller ownership to
Cursor. Revalidate every free-form provider or model answer against the same
fresh inventory.

The selection axes therefore have one dependency: controller transport
`manual` implies relay mode `manual-handoff`. All other controller transports
exclude `manual-handoff`. Controller provider/model and worker
provider/transport/model remain independent choices.

## User-question relay

If the controller returns `ask-user`, or a worker receipt contains
`needs_user_input`, stop new dispatches. The host parent asks the bounded
question through its available structured-question tool, returns the user's
answer to the same controller session, and waits for a revised work order or
control decision. The host must not answer on the user's behalf, and a worker
must not ask the end user directly.

Keep the three roles explicit in every question and receipt:

- the host relays questions and enforces tools and permissions;
- the controller decomposes, issues work orders, reviews evidence, and decides;
- each worker executes one approved work order and returns a proof receipt.

Do not describe host-mediated request-response as direct model-to-model control.

Do not ask the user to select an unavailable model and then silently substitute
another. Use `requested-not-attested` when the host accepts a requested setting
but cannot prove the effective runtime value.

## Setup state machine

When the requested route is not ready, offer these bounded outcomes:

- prepare or run approved setup for that route;
- select a verified ready route;
- continue plan-only;
- stop.

Before setup, show the exact target, current official source, version or release
channel, action, files or user-level settings affected, authentication and
billing impact, smoke-test cost, and rollback. Require explicit approval before
installing, updating, configuring, starting login, enabling billing, or sending
a request. Never place personal credentials or personal MCP configuration in
the repository.

After an approved setup action:

1. repeat the identity and version probe;
2. verify authentication without exposing credentials;
3. fetch the current model catalog when supported;
4. verify sandbox, permission, resume, cancel, and receipt capabilities;
5. ask approval for the smallest read-only smoke request if it can consume
   quota or send repository data;
6. compare the response with the expected receipt contract;
7. classify the route again.

A successful text response does not prove model identity, permission
enforcement, resume support, or receipt authenticity. Record each property
separately.

## Host-mediated controller loop

For any external controller provider:

1. the host sends the frozen task envelope to the selected route;
2. the controller returns bounded work orders;
3. the host verifies each order against the selected worker routes, then
   dispatches native workers or executes sequentially under host permissions;
4. the host returns proof receipts to the same controller session when resume
   is supported;
5. the controller verifies receipts and returns one control decision;
6. on `retry` or `escalate`, repeat only within the original authority and
   budget;
7. the host parent presents `ask-user` decisions and the final accepted result.

The host may reject unsafe or unauthorized instructions, but it must not alter
a receipt or approve the controller's work. The controller cannot widen host
permissions or communicate directly with native workers unless the host exposes
and authorizes such a route.
