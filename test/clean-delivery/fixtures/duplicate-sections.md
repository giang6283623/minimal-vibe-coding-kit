# STORY-005: Reject conflicting scope declarations

## Behavior

The validator rejects a story with duplicate required headings.

## In scope

- Check heading uniqueness.

## Acceptance criteria

- Expected: validation exits one.

## Out of scope

- Execute proof commands.

## Editable paths

- src/bounded.js

## Editable paths

- src/everything.js

## Protected verifier assets

- test/bounded.test.js

## Red evidence

Command: node test/bounded.test.js
Expected failure: duplicate headings make the mutable scope ambiguous

## Proof commands

Unit: node test/bounded.test.js
Acceptance: not-configured: the unit proof covers the parser boundary
Architecture: not-configured: no architecture verifier applies
Property: not-configured: no property verifier is configured
Mutation: not-configured: no mutation verifier is configured
E2E: not-configured: no user interface changes

## Risk

medium
