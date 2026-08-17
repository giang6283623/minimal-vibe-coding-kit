# Minimal Vibe Coding Kit integration

## Before writing

1. Read `backbone.yml` and root instructions.
2. If `meta.template_status` is `uninitialized`, follow the first-time init flow and wait for approval.
3. Respect `conventions.review_required_before_write` for skills, rules, commands, and other agent surfaces.
4. Preserve dirty files and patch current bytes instead of restoring them from Git.
5. Use existing route, localization, resource, and generated-definition accessors.

## Proportional effort

- F1/S1 or F2/S1: brief, one implementation slice, focused tests, and one bounded visual check when scored 3-4.
- F3, S2, or S3: add state inventory, route matrix, and browser checks.
- F4, S4, B2, authentication, commerce, or live data: use the project's high-risk planning, security, and verification workflows.

ClearThought and Sequential Thinking are optional for ambiguous or multi-path work. Proofline, graph orchestration, parallel analysis, and visual loops remain gated by project rules. Do not invoke them for a small task merely because they exist.

## Working artifacts

Use `.replica/` for the brief and local evidence. Before creating large local artifacts, propose project-specific ignore rules for:

```text
.replica/evidence/
.replica/screenshots/
.replica/assets/
.replica/fixtures/
```

For multiple clones, put each clone in a user-approved `workspace/<slug>/` folder and run the brief validator with that clone folder as `--project-root`. Validate the slug before joining paths and never overwrite an existing clone folder.

Do not make the kit installer add these ignores to every project. The user may choose to commit sanitized brief and verification files.

## Verification

Run the command in `backbone.yml` after relevant changes. Agent-surface changes require the repository AgentShield probe. Report changed files, validation receipts, visual gate, and unresolved risk.

If the authorized asset downloader is prepared, show the owner its exact host allowlist and command. Never run it as an agent action. After the owner confirms completion, run only the offline verifier and the normal project validation command.
