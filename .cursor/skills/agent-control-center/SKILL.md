---
name: agent-control-center
description: Coordinate complex coding work through one verified controller and bounded native or cross-provider workers. Use when a user wants an active Codex, Claude, Cursor, OpenCode, Grok, Kimi, or other capable host to coordinate work through a native, automatically selected, or explicitly selected provider controller; when native agents may be unavailable; or when the workflow needs safe controller transfer, transport, and sequential fallbacks. Never bypass provider billing or permissions, and keep controller choice separate from task topology.
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
- `topology`: `plan-only`, `sequential`, `countercheck`, `parallel-analysis`,
  `verified-graph`, or `proofline`;
- `scope`: repository root, allowed paths, protected paths, and external
  systems in scope;
- `authorization`: read-only or approved mutation boundaries;
- `budget`: lane count, time, retries, and any user-stated cost limit;
- `acceptance`: commands, artifacts, objective checks, and human gates.

Do not infer missing mutation authority, credentials, deployment authority, or
permission to contact external people or systems.

## Workflow

1. **Freeze the task.** Read `backbone.yml` and applicable repository
   instructions. Record the inputs above and identify decisions that still
   belong to the user.
2. **Resolve the controller.** Read
   [controller-modes.md](references/controller-modes.md). For an explicitly
   selected or automatic provider, also read
   [provider-selection.md](references/provider-selection.md). If any child
   agent or multi-agent lane will be dispatched, follow
   `.vibekit/docs/ORCHESTRATION_MODES.md` immediately before the first
   dispatch. Controller choice and Default, Auto, or Custom routing preference
   remain separate decisions.
3. **Build a live inventory.** Read
   [capability-contract.md](references/capability-contract.md). Classify each
   route as `ready`, `installed-unverified`, or `unavailable` with
   non-mutating probes only. A working application session does not prove that
   its CLI, SDK, API, MCP bridge, account quota, or model alias is ready.
4. **Choose a proportional topology.** Keep trivial and small work
   sequential. Use `countercheck` for one independent read-only challenge,
   `parallel-analysis` for 2-5 independent read-only lanes,
   `graph-engineering-verified-orchestration` for a dependency graph, and
   `proofline-orchestration` for role-separated governance. Invoke the named
   skill instead of duplicating its procedure.
5. **Issue bounded work.** Read
   [handoff-contract.md](references/handoff-contract.md). Send only the minimum
   task envelope and work order needed by the selected worker. Keep secrets,
   untrusted instructions, and unrelated repository content out of prompts.
6. **Collect receipts.** Require every worker to return its scope used,
   artifacts, validation evidence, effective runtime details when attested,
   open risks, and status. A worker's prose is supporting evidence, not proof
   that the host enforced permissions or model identity.
7. **Verify and decide.** Check the artifact and evidence from the controller
   session. Return `accept`, `retry`, `escalate`, `ask-user`, or `stop`. Never
   let a worker approve its own unverified mutation.
8. **Deliver.** Report the controller, host, topology, routes used, requested
   versus attested models, changed files, validation, fallbacks, and residual
   risks. State `requested-not-attested` when effective settings cannot be
   authenticated through the host boundary.

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
- topology and worker routes;
- accepted artifacts and validation;
- any fallback or `requested-not-attested` status;
- unresolved decisions and the next safe action.

Keep internal reasoning private. Return machine-readable envelopes only when
the user or host explicitly requests them.
