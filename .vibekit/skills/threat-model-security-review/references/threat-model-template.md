# Threat Model Template

Use this template when repository policy does not already define a sufficiently specific
threat model. Label every entry as `observed`, `user-provided`, or `inferred`.

## Review identity

- Repository:
- Revision or working-tree state:
- In-scope paths:
- Explicit exclusions:
- Authorization boundary:
- Review date:

## System context

- Product or runtime purpose:
- Primary deployed surfaces:
- Security-relevant dependencies:
- Data stores and external services:
- Deployment assumptions:

## Assets and actors

| Asset or privilege | Why it matters | Authorized actors | Evidence |
|---|---|---|---|

## Entry points and untrusted inputs

| Entry point | Input or actor | Trust level | Parser or first control | Evidence |
|---|---|---|---|---|

## Trust boundaries

| Boundary | From | To | Required control | Evidence |
|---|---|---|---|---|

## Sensitive actions and sinks

| Action or sink | Required authorization | Security impact | Evidence |
|---|---|---|---|

## Security invariants

State each invariant as a testable rule:

1. Only `<actor>` may `<sensitive action>` after `<required control>`.
2. Attacker-controlled `<input>` must never reach `<sink>` without `<validation>`.
3. Data classified as `<class>` must remain within `<boundary>`.

## High-impact failure modes

- Authentication or authorization bypass:
- Cross-tenant or cross-user access:
- Secret or sensitive-data exposure:
- Arbitrary code, command, query, or template execution:
- Arbitrary filesystem or network access:
- Integrity, availability, or resource-exhaustion failures:

## Assumptions and unknowns

| Item | Status | How to resolve | Effect if false |
|---|---|---|---|
