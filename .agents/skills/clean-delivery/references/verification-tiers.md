# Verification tiers

Choose the lowest tier that matches the actual risk. More checks are not automatically more rigorous.

| Risk | Minimum evidence | Add when relevant |
| --- | --- | --- |
| Low | Focused behavior check, repository validation, final diff review | Failure-path check |
| Medium | Low tier plus acceptance evidence and architecture review | Boundary and property checks |
| High | Medium tier plus security review, protected-oracle review, and independent verification when trustworthy | Mutation and targeted end-to-end checks |
| Critical | Explicit human approval, High tier, rollback proof, and an independent final verifier | Staging or production-like checks approved by the user |

Rules:

- A named command is evidence only after it runs successfully and its result is recorded.
- null, absent, or not-configured means no verifier exists. It never means passed.
- Do not auto-install a framework, scanner, browser, container, or mutation tool.
- End-to-end work remains subject to the repository's visual and end-to-end gate.
- Mutation scores and coverage targets are repository decisions, not universal thresholds.
- If risk exceeds available proof, stop with a proof gap.
