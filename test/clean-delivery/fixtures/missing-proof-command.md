# STORY-004: Reject an incomplete proof contract

## Behavior

The validator rejects a story without a unit proof.

## In scope

- Check named proof commands.

## Acceptance criteria

- Expected: validation exits one.

## Out of scope

- Run commands.

## Editable paths

- example.js

## Protected verifier assets

- example.test.js

## Red evidence

Command: node example.test.js
Expected failure: missing behavior

## Proof commands

Acceptance: not-configured: example
Architecture: not-configured: example
Property: not-configured: example
Mutation: not-configured: example
E2E: not-configured: example

## Risk

low
