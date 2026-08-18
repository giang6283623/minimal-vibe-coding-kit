# Swap Control Center examples

Use these examples as interaction patterns, not capability claims. Replace every
provider, model, command, and status with current verified evidence.

## Cursor host, external controller

1. Cursor remains the host and parent user conversation.
2. Cursor builds a live inventory, then uses `AskUserQuestion` or its exposed
   structured equivalent for unresolved choices. The user selects
   `automatic-host-relay`, a locally preflighted Codex controller route and
   model, plus a separate Cursor-native worker route and model.
3. Cursor records `host=cursor`, `controller=codex`, and the selected Cursor
   worker defaults. Controller and worker selections remain independent.
4. Cursor starts the bundled Codex CLI bridge with the frozen task envelope,
   captures its explicit session ID, and keeps Codex multi-agent execution
   disabled before creating analysis lanes.
5. Codex returns bounded work orders for Cursor-native agents. If Codex returns
   `ask-user`, Cursor asks in the parent conversation and returns the answer to
   the same Codex session.
6. Cursor validates each order against the selected worker route, dispatches
   those agents, and returns unaltered proof receipts by resuming the same
   explicit Codex session.
7. Codex reviews the receipts and returns `accept`, `retry`, `escalate`,
   `ask-user`, or `stop`.
8. Cursor presents the result or user decision. Cursor does not create its own
   lane plan, and Codex never claims direct control of the Cursor Agent window.

## CLI host, selected controller

1. The active CLI inventories its native route and any already configured
   provider bridges.
2. The parent asks the user to select among verified ready providers, then a
   transport, model, and supported reasoning effort.
3. The selected controller issues work orders. The CLI host enforces scope and
   permissions and returns receipts.
4. The selected controller verifies the artifacts and makes the final control
   decision.

## Requested route unavailable

1. The user requests a provider whose application works but whose CLI route is
   missing or unauthenticated.
2. Mark that CLI route `unavailable` or `installed-unverified`. Do not reuse the
   application login as proof.
3. Offer a current official setup proposal, a verified ready alternative, or
   plan-only output.
4. Install, configure, authenticate, or smoke-test only after the user approves
   the exact action. If approval is absent, remain plan-only or stop.
