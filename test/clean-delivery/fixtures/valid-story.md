# STORY-001: Reject an incomplete delivery story

## Behavior

The validator accepts a complete story and reports one deterministic success line.

## In scope

- Validate mandatory story fields.

## Acceptance criteria

- Expected: complete input exits zero and incomplete input exits one.

## Out of scope

- Execute any proof command from the story.

## Editable paths

- .vibekit/skills/clean-delivery/scripts/validate-story.mjs

## Protected verifier assets

- test/clean-delivery/fixtures/valid-story.md

## Red evidence

Command: node .vibekit/skills/clean-delivery/scripts/validate-story.mjs test/clean-delivery/fixtures/valid-story.md
Expected failure: the validator did not exist before this behavior slice

## Proof commands

Unit: node test/clean-delivery/scripts/test-story-contract.mjs
Acceptance: node .vibekit/skills/clean-delivery/scripts/validate-story.mjs test/clean-delivery/fixtures/valid-story.md
Architecture: not-configured: no architecture executable applies to this isolated validator
Property: not-configured: bounded deterministic schema checks are sufficient
Mutation: not-configured: no mutation tool is configured
E2E: not-configured: no user-visible runtime surface changes

## Risk

low
