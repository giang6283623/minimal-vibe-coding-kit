# Clean Delivery story template

Copy this template for one observable behavior slice. Replace every placeholder before implementation.

~~~markdown
# STORY-001: Short observable outcome

## Behavior

Describe what a user or external caller can observe.

## In scope

- One bounded change.

## Acceptance criteria

- Expected: state the observable result and important failure behavior.

## Out of scope

- State one nearby concern that will not change.

## Editable paths

- path/to/edit

## Protected verifier assets

- path/to/test-or-validator

## Red evidence

Command: exact command
Expected failure: specific failure caused by the missing behavior

## Proof commands

Unit: exact command
Acceptance: exact command or not-configured: reason
Architecture: exact command or not-configured: reason
Property: exact command or not-configured: reason
Mutation: exact command or not-configured: reason
E2E: exact command or not-configured: reason

## Risk

low
~~~

Protected verifier assets are tests, fixtures, schemas, snapshots, policies, benchmark inputs, or validation scripts whose weakening could create a false pass. Changes to them need explicit verifier ownership and review.
