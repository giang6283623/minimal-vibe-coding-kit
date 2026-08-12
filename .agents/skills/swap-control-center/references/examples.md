# Swap Control Center examples

Use these examples as interaction patterns, not capability claims. Replace every
provider, model, command, and status with current verified evidence.

## Cursor host, external controller

1. Cursor remains the host and parent user conversation.
2. The user selects a ready Codex controller route and one model from the fresh
   authenticated catalog.
3. Cursor sends the task envelope to the Codex controller.
4. Codex returns bounded work orders for Cursor-native agents.
5. Cursor dispatches those agents and returns proof receipts to the same Codex
   session.
6. Codex returns `accept`, `retry`, `escalate`, `ask-user`, or `stop`.
7. Cursor presents the result or user decision. Codex never claims direct
   control of the Cursor Agent window.

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
