# STORY-002: Reject missing scope fences

## Behavior

The validator rejects a story without an out-of-scope declaration.

## In scope

- Check required headings.

## Acceptance criteria

- Expected: validation exits one.

## Editable paths

- example.js

## Protected verifier assets

- example.test.js

## Red evidence

Command: node example.test.js
Expected failure: missing behavior

## Proof commands

Unit: node example.test.js
Acceptance: not-configured: example
Architecture: not-configured: example
Property: not-configured: example
Mutation: not-configured: example
E2E: not-configured: example

## Risk

low
