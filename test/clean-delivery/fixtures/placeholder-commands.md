# STORY-006: Reject placeholder proof evidence

## Behavior

The validator rejects proof fields that were never configured.

## In scope

- Check evidence field values.

## Acceptance criteria

- Expected: validation exits one.

## Out of scope

- Execute proof commands.

## Editable paths

- src/bounded.js

## Protected verifier assets

- test/bounded.test.js

## Red evidence

Command: exact command
Expected failure: not-configured: reason

## Proof commands

Unit: exact command
Acceptance: exact command or not-configured: reason
Architecture: not-configured: reason
Property: not-configured: reason
Mutation: not-configured: reason
E2E: not-configured: reason

## Risk

medium
