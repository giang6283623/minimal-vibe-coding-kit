---
name: swap-control-center
description: Select verified controller and worker routes with independent provider, model, reasoning effort, and transport choices, then bind a compatible relay mode for work initiated from Cursor, Codex, Claude, OpenCode, Grok, Kimi, or another capable host. Use when the user wants the active host to relay bounded work to a different controller, choose subagent models separately, optionally set up and test an approved CLI or bridge, or transfer controller ownership once without changing host permissions or creating multiple controllers.
---

# Swap Control Center

Use this skill as the dynamic-provider preset for
`agent-control-center`. Keep one orchestration engine and exactly one active
controller.

## Procedure

1. Read [Agent Control Center](../agent-control-center/SKILL.md) and its four
   references. If the core skill is incomplete, stop and report the missing
   resource.
2. Freeze the objective, host, topology, scope, authorization, budget, and
   acceptance contract before route selection.
3. Build the live route inventory first. Classify every application, CLI, SDK,
   API, MCP bridge, and manual route independently. Never infer a ready route
   from a provider name or an application login.
4. Follow
   [provider-selection.md](../agent-control-center/references/provider-selection.md).
   In the active parent conversation, use the host's exposed structured
   question tool, including `AskUserQuestion` or `request_user_input` when that
   exact tool is available. Otherwise ask one concise plain-text question at a
   time. Resolve controller and worker routes independently from current
   verified capabilities. Derive `manual-handoff` from a manual controller
   transport; otherwise select a compatible automatic or sequential relay mode.
   Never infer worker assignments from the selected controller.
5. If the chosen route needs setup, present the exact official source, version,
   install or configuration action, authentication step, expected billing or
   data boundary, rollback, and bounded smoke test. Obtain explicit user
   approval before each state-changing action or paid request. Rebuild the
   inventory after setup.
6. Bind the selected controller provider to `controller=<provider-id>`, bind
   the separately selected worker defaults or per-role routes, and run the
   Agent Control Center host-mediated loop. The host parent remains the
   user-facing relay and dispatch authority. The selected controller owns
   decomposition, work-order decisions, receipt review, and final acceptance.
   Topology skills execute controller-issued orders and do not create a second
   plan or controller.
   For `provider=codex` and `transport=codex-cli`, use the bundled stateful
   bridge in `../agent-control-center/references/codex-cli-bridge.md`. Do not
   improvise a one-shot command. Other external providers require an equivalent
   verified preflight, start, reply, cancel, and close adapter before automatic
   use.
7. If the user requests a later role swap, use the one-transfer contract in
   `controller-modes.md`. Pause dispatch, settle outstanding work, obtain any
   required approval, invalidate unused old orders, and resume with one new
   controller. Never run co-controllers or recursive controller delegation.
8. Report the active host, controller provider, transport, requested and
   attested model settings, setup or smoke-test evidence, worker routes,
   transfer history, validation, fallback, and residual risk.

Read [examples.md](references/examples.md) when a host needs a concrete Cursor,
CLI, or unavailable-route interaction pattern.

## Codex selection

Codex is a normal fixed-provider choice in this skill. When the user selects
Codex, set `controller=codex` and follow the Codex route order and Cursor
app-only safeguards in `controller-modes.md`. Require a verified Codex route and
ask before any fallback to another controller. Do not require Cursor CLI or
Cursor SDK merely because Cursor is the active host.

When Cursor hosts a Codex controller with Cursor workers, send the task envelope
through the stateful bridge first. Codex returns bounded work orders, Cursor
dispatches only the approved Cursor worker routes, Cursor returns proof receipts
to the same Codex session, and Codex decides. Do not launch Codex analysis lanes
unless the user independently selected a ready Codex worker route.

Before the first Codex controller request, use bridge preflight output to ask
for the model and reasoning effort through the active parent's exact structured
question tool, including `AskUserTool` when that tool is available. Preserve an
explicit user choice. Do not offer values absent from the bridge preflight
catalog.

## Fail-closed rules

- Never choose a provider, model, effort, or route from documentation alone.
- Never install a CLI, start login, enable billing, edit user configuration, or
  send a paid test request without explicit approval.
- Never use a repository config file for personal provider credentials or a
  personal controller bridge.
- Never assign the controller provider as a worker merely because it is the
  controller. Require an independent verified worker selection.
- Never treat a command name as provider identity. Verify the binary's own
  version or authenticated metadata because aliases such as `agent` can collide.
- Never claim that an external controller directly controls the host UI or
  native agents. Plain MCP, CLI, SDK, and manual transports are request-response
  routes.
- Use `requested-not-attested` whenever the effective model or reasoning effort
  cannot be authenticated through the host boundary.

## Report

Lead with the accepted task outcome or the exact missing capability. Then use
the Agent Control Center output contract. Report relay mode, controller route,
worker routes, and every user-approved setup action or controller transfer.
