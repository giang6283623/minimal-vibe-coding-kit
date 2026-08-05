---
name: clean-delivery
description: Deliver one observable behavior slice through Specify, Code, Clean, Architect, Harden, and Verify gates with proportional rigor and reproducible proof. Use when the user asks for extreme craftsmanship, clean-code delivery, TDD, architecture boundaries, or a high-confidence implementation workflow.
argument-hint: "<goal; source of truth; editable paths; proof commands; risk>"
---

# Clean Delivery

Deliver one small, observable behavior slice with evidence. The six stages are quality gates, not six mandatory agents.

## Before work

Read these files completely:

1. references/story-template.md
2. references/verification-tiers.md
3. references/architecture-contract.md
4. references/proof-return-mapping.md

Read backbone.yml and repository instructions. Refuse protected-path changes without approval. Never install tools, enable hooks, or broaden authority merely to satisfy a gate.

## Required input contract

Freeze one story before implementation. Record:

- one observable behavior;
- in-scope and out-of-scope work;
- editable paths and protected verifier assets;
- acceptance criteria;
- the expected failing check and proof commands;
- a low, medium, high, or critical risk tier.

Create the story from references/story-template.md, then validate it:

~~~sh
node .vibekit/skills/clean-delivery/scripts/validate-story.mjs <story.md>
~~~

A missing verifier is a declared proof gap, not permission to invent evidence. "not-configured: <reason>" is valid only when the gate is not proportionate to the slice.

## Six gates

### 1. Specify

Turn the request into one story whose outcome can be observed from outside the implementation. Resolve material ambiguity before code. Keep Gherkin optional: clear bullet criteria are acceptable.

Exit when the story validator passes and scope is frozen.

### 2. Code

Run the smallest relevant check before implementation and capture the expected failure. Implement only enough production code to make the behavior pass. Do not weaken tests or protected verifier assets.

For a documentation-only or configuration-only slice, record why a red unit test is not applicable and use the smallest deterministic validator that can fail before the change.

Exit when the red evidence is authentic and the minimal behavior passes.

### 3. Clean

Improve names, duplication, function size, and error clarity without changing behavior. Prefer domain language and single-purpose units. Rerun the same focused proof after each meaningful cleanup.

Exit when the implementation is readable and the behavior proof still passes.

### 4. Architect

Check dependencies and boundaries against backbone.yml and references/architecture-contract.md. Use the repository's configured architecture command when one exists. Do not claim an architecture check ran when the command is null or absent.

Exit when boundaries are respected or every unresolved boundary risk is explicit.

### 5. Harden

Apply the risk-proportional verification tier. Add failure-path, boundary, property, mutation, security, or end-to-end evidence only when the risk and behavior justify the cost. Never auto-install a missing test tool.

Exit when the required tier passes or a proof gap blocks delivery.

### 6. Verify

Run the repository validation command and all story proof commands. Inspect the final diff for scope drift. For high or critical risk, separate implementation from final verification when the runtime supports a trustworthy independent verifier. Otherwise disclose the limitation.

Return evidence using references/proof-return-mapping.md. A command is evidence only when its exit status and relevant output are captured.

## Proportional operation

- Trivial: use the existing repository validation; do not manufacture ceremony.
- Small: one story, one focused failing check, cleanup, and repository validation.
- Medium: add an architecture review and risk-tier checks.
- Large or risky: split into multiple independently verifiable stories and consider Proofline or graph orchestration.

Invoke subagents only when work is independently bounded and parallelism materially helps. Provider selection never changes safety, authorization, protected paths, or proof requirements.

Before any such dispatch, follow .vibekit/docs/ORCHESTRATION_MODES.md in the parent session.

## Stop conditions

Stop safely when scope is ambiguous, a protected oracle would need modification, red evidence cannot be reproduced, required proof is unavailable, or the final diff exceeds the frozen story. Report the blocker and the smallest decision needed.

## Output

Report the story identifier, result of each gate, changed paths, commands with exit status, remaining proof gaps, and the final keep or stop decision. Do not create a second evidence system when a Proofline ledger already exists.
