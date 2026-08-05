# Architecture contract

Architecture evidence extends the repository's existing contract. It does not create a competing architecture layer.

Check in this order:

1. Read conventions.architecture in backbone.yml.
2. Identify the components touched by the story and their allowed dependency direction.
3. Reuse an existing architecture verifier from the named verification contract when configured.
4. Inspect new imports, cross-layer calls, shared state, and public API changes.
5. Record an explicit proof gap when no executable verifier exists.

Prefer stable dependency direction, small public surfaces, dependency inversion at volatile boundaries, and behavior that can be tested without environment-wide setup. Do not introduce a new top-level layer or broad project pattern without user approval.

A review statement is not equivalent to an executed architecture command. Report them separately.
