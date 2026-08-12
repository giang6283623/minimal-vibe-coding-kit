---
name: agent-control-center
description: Coordinate complex coding work through one verified controller and bounded native or cross-provider workers. Use when a user wants an active Codex, Claude, Cursor, OpenCode, Grok, Kimi, or other capable host to coordinate work through a native, automatically selected, or explicitly selected provider controller; choose controller and subagent models independently; handle unavailable native agents; or use safe controller transfer, transport, and sequential fallbacks. Never bypass provider billing or permissions, and keep controller choice separate from task topology.
---

# Agent Control Center

Coordinate one task without confusing the controller, host, worker, model, or
transport. Keep exactly one controller responsible for the plan, dispatch
decisions, verification, and final acceptance.

## Core invariants

- Treat the active application or CLI as the host. The host exposes tools and
  retains execution authority even when another provider is the controller.
- Treat a model as a capability behind a host, not as a controllable process.
- Keep the host parent as the user-facing relay and execution authority. An
  external controller owns orchestration decisions, but cannot widen host
  permissions or directly control native agents.
- Keep controller and worker provider, transport, model, and reasoning choices
  separate. Selecting a controller never assigns that provider as a worker.
- When an external controller is active, topology skills run in executor mode:
  the controller creates work orders and reviews receipts, while the host asks
  user questions, dispatches approved workers, and returns their receipts.
- Never claim that plain MCP lets a server click, control, or spawn agents in
  its client. Use host-mediated work orders and proof receipts.
- Give every worker a bounded scope, budget, expected artifact, validation,
  and stop condition. Do not permit recursive worker dispatch unless the work
  order explicitly allows one bounded child layer.
- Allow at most one controller transfer per task. Require user approval before
  a transfer changes provider, billing, permissions, or mutation authority.
- Preserve repository rules, protected paths, human gates, and user-owned
  changes across every provider boundary.

## Inputs

Resolve these values before dispatch:

- `objective`: one observable outcome;
- `controller`: `native`, `auto`, or a registered provider identifier such as
  `codex`, `claude`, `cursor`, `opencode`, `grok`, or `kimi`; default to
  `native` unless the user requests cross-provider control or automatic
  selection;
- `relay_mode`: `automatic-host-relay` or `sequential-host-relay` for a
  non-manual controller transport; bind `manual-handoff` automatically when
  `controller_route.transport=manual`;
- `controller_route`: controller provider, transport, model, and supported
  reasoning effort;
- `worker_routes`: default or per-role worker provider, transport, model, and
  supported reasoning effort, selected independently from the controller;
- `topology`: `plan-only`, `sequential`, `countercheck`, `parallel-analysis`,
  `verified-graph`, or `proofline`;
- `scope`: repository root, allowed paths, protected paths, and external
  systems in scope;
- `authorization`: read-only or approved mutation boundaries;
- `budget`: lane count, time, retries, and any user-stated cost limit;
- `acceptance`: commands, artifacts, objective checks, and human gates.

Do not infer a worker route from the controller route. Do not infer missing
mutation authority, credentials, deployment authority, or permission to
contact external people or systems.

## Workflow

1. **Freeze the task.** Read `backbone.yml` and applicable repository
   instructions. Record the inputs above and identify decisions that still
   belong to the user.
2. **Build a live inventory.** Read
   [capability-contract.md](references/capability-contract.md). Classify each
   route as `ready`, `installed-unverified`, or `unavailable` with
   non-mutating probes only. A working application session does not prove that
   its CLI, SDK, API, MCP bridge, account quota, or model alias is ready.
3. **Resolve role routes.** Read
   [controller-modes.md](references/controller-modes.md) and
   [provider-selection.md](references/provider-selection.md). Resolve the
   controller route and worker routes independently, then derive or select the
   compatible relay mode. Ask every unresolved choice only in the parent
   conversation through its exposed structured-question tool, or one concise
   plain-text question when none is available. If any child agent or
   multi-agent lane will be dispatched,
   follow `.vibekit/docs/ORCHESTRATION_MODES.md` immediately before the first
   dispatch. Controller choice and Default, Auto, or Custom routing preference
   remain separate decisions.
4. **Choose a proportional topology.** Keep trivial and small work
   sequential. Use `countercheck` for one independent read-only challenge,
   `parallel-analysis` for 2-5 independent read-only lanes,
   `graph-engineering-verified-orchestration` for a dependency graph, and
   `proofline-orchestration` for role-separated governance. Invoke the named
   skill instead of duplicating its procedure.
5. **Apply controller precedence.** For `controller=native` or `current`, let
   the parent apply the selected topology normally. For any external
   controller, send the frozen task envelope first and wait for its work
   orders. A topology skill may execute those orders but must not independently
   decompose the task, replace worker routes, merge receipts, or make the final
   decision. Reasoning skills such as `sequential-thinking` and `clearthought`
   may freeze evidence and unknowns before handoff, but their decomposition and
   decision operations belong to the external controller.
6. **Issue bounded work.** Read
   [handoff-contract.md](references/handoff-contract.md). Send only the minimum
   task envelope and work order needed by the selected worker. Keep secrets,
   untrusted instructions, and unrelated repository content out of prompts.
7. **Collect receipts.** Require every worker to return its scope used,
   artifacts, validation evidence, effective runtime details when attested,
   open risks, and status. A worker's prose is supporting evidence, not proof
   that the host enforced permissions or model identity.
8. **Verify and decide.** For an external controller, return unaltered receipts
   to the same controller session and relay its `accept`, `retry`, `escalate`,
   `ask-user`, or `stop` decision. For a native controller, decide in the
   parent. Never let a worker approve its own unverified mutation.
9. **Deliver.** Report the controller, host, topology, routes used, requested
   versus attested models, changed files, validation, fallbacks, and residual
   risks. State `requested-not-attested` when effective settings cannot be
   authenticated through the host boundary.

Before accepting a complete controller trace, run the bundled contract
validator described in [handoff-contract.md](references/handoff-contract.md).
It checks approved routes, controller-first ordering, host relay boundaries,
and topology-specific acceptance gates. Documentation wording alone is not
proof that a trace followed this workflow.

## Fallback order

Use the first authorized route that preserves the task's safety floor:

1. selected ready controller with enforceable workers;
2. selected controller with host-mediated sequential execution;
3. native controller with user approval when another controller was requested;
4. manual bounded handoff when only interactive applications are available;
5. plan-only output;
6. stop and name the missing capability or authority.

Do not install software, start login flows, enable usage-based billing, weaken
permissions, guess a model, or switch controllers silently to make a route
appear ready.

## Output contract

Lead with the task outcome. Then report:

- controller and host;
- relay mode, controller route, topology, and worker routes;
- accepted artifacts and validation;
- any fallback or `requested-not-attested` status;
- unresolved decisions and the next safe action.

Keep internal reasoning private. Return machine-readable envelopes only when
the user or host explicitly requests them.
