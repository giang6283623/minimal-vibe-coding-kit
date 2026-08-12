# Changelog

## Unreleased

### Changed

- Made relay mode, controller provider/model, and worker provider/model separate live-inventory selections in `agent-control-center` and `swap-control-center`. Unresolved choices now return to the parent host through `AskUserQuestion`, `request_user_input`, or the available plain-question fallback.
- Bound `manual-handoff` directly to a manual controller transport, and added external-controller precedence to `sequential-thinking` and `clearthought` so the host freezes evidence but the selected controller owns decomposition and decisions.

### Fixed

- Added external-controller precedence to `parallel-analysis` and `proofline-orchestration`: a selected Codex controller now creates work orders and decides from returned receipts, while a Cursor host dispatches independently selected Cursor workers instead of launching Codex analysis lanes or a second planning controller.
- Corrected the version 2 sequential handoff example so each work order matches its approved route. Added complete native and Cursor-to-Codex-to-Cursor traces plus a dependency-free validator that rejects route drift, implicit controller-as-worker selection, reversed authority, invalid relay bindings, and Proofline acceptance without its required seal and Owner gates.

### Validation

- `npm test`, `npm run pack:dry-run`, the dependency-free AgentShield probe, and `git diff --check` passed. The optional local `ecc-agentshield` package was absent, so the changed agent surfaces also received the documented manual review with no critical or high findings.

## 0.5.12 - 2026-08-12

### Added

- Added `agent-control-center` across Claude, Cursor, Codex, OpenCode, Grok, and Kimi. It separates controller ownership from provider routing and task topology, classifies each app, CLI, SDK, API, MCP, or manual transport independently, and coordinates bounded work through task envelopes, work orders, proof receipts, and fail-closed control decisions.
- Added `swap-control-center` as the dynamic-provider preset. It asks the parent user to choose a controller provider, transport, live-catalog model, and supported reasoning effort, keeps one controller, permits one approved transfer, and gates setup and smoke-test actions behind explicit consent.
- Extended `agent-control-center` with generic provider selection, alias-safe CLI identity probes, current official setup guidance, and a provider-neutral host-mediated controller loop.
- Documented the optional user-level `codex mcp-server` bridge and manual app-only fallback without adding repository MCP configuration or credentials.

### Changed

- Reworked `clone-website` into a local-artifact-only UI workflow with safe per-clone workspaces. The agent now acts as a Component UI Developer that consumes user-provided mock JSON, screenshots, owner exports, design files, and local assets. Target URLs are metadata only, all media maps to relative local paths, and the skill includes user-run Chrome DevTools Console examples for preparing authorized local data.

### Fixed

- Removed the obsolete live capture plan, remote asset/API request manifests, and curl runner from the clone workflow. The brief validator now accepts only `local-artifacts-only` data mode and rejects legacy capture fields.

### Validation

- `npm test`, `npm run validate`, `npm run pack:dry-run`, the dependency-free AgentShield probe, and `git diff --check` passed. The local external AgentShield package was absent, so the agent-surface changes also received the documented manual review. The package dry-run includes all 1,062 on-disk skill files across 1,179 packaged files.

## 0.5.11 - 2026-08-11

### Added

- Added an optional local Cursor SDK adapter with live account model discovery, remembered `cursor-sdk` assignments, strict project-root validation, read-only and bounded workspace-write tool profiles, sandbox enforcement, requested-versus-effective model evidence, a fake-SDK sandbox contract, and a short end-user setup and model-change guide. The kit keeps its Node.js 18 baseline and never installs the SDK, starts login, stores credentials, invokes shell tools, or enables Cursor cloud agents.
- Added `clone-website` across Claude, Cursor, Codex, OpenCode, Grok, and Kimi as skill 23. It uses explicit authorization and content-rights modes, dynamic fidelity, scope, stack, and backend choices, bounded static or approved isolated capture, neutralized public-research output, a hardened brief validator, adversarial fixtures, and evidence-backed parity verdicts.

### Changed

- Disabled file-based Cursor setting sources in both SDK adapter profiles so repository, user, team, plugin, and managed-device hooks, MCP servers, and subagents cannot bypass the declared tool allowlist.
- Bound clone authorization to exact routes, deployment, enabled features, and approved data; added explicit redirect, response-byte, and elapsed-time caps; and required public-research neutralization inventory plus an unaffiliated-demo notice.
- Added a canonical clone validation receipt that starts invalid and becomes valid only after normalized brief and plan digests are committed, preventing stale or partial outputs from counting as approved.

### Fixed

- Compared the complete requested and effective Cursor model selection, including every parameter, before reporting `exact-match`.
- Rejected boolean clone-brief versions, non-canonical output paths, broad feature approval, evidence-output collisions, malformed raw input, duplicate JSON keys, invalid UTF-8, and oversized briefs with focused regressions.
- Corrected Cursor SDK documentation so remembered metadata is described accurately, model examples require a freshly verified id, and the maintainer-only fake-SDK test is not presented as available in installed projects.

### Validation

- `npm test`, `npm run security:probe`, `npm run pack:dry-run`, and `git diff --check` passed. The release includes 40 Cursor SDK adapter checks, the expanded clone-website validator contract, zero dependency-free validator failures or warnings, no built-in suspicious AgentShield markers, and all 1,002 on-disk skill files in the 1,119-file npm tarball.

## 0.5.10 - 2026-08-10

### Added

- Added `wait-what` across Claude, Cursor, Codex, OpenCode, Grok, and Kimi (skill 22). A user-invoked comprehension repair: `/wait-what [the part that lost you]` makes the agent stop and re-pitch its previous message with the missing premise restored, in the user's conversation language, using the project glossary, with zero new work. The kit-native version fixes the upstream concept's blind spots: it diagnoses the specific failure (missing premise, undefined term, skipped step, wrong altitude, buried outcome) instead of compressing, bounds the register to the re-pitch, keeps code identifiers verbatim, applies ASD-STE100-style constraints only to English replies, and falls back to `backbone.yml` vocabulary when no glossary exists.
- Added a plain-language register to the shared writing rules (AGENTS.md, Claude, Cursor, and Grok rule files) and `backbone.yml` `custom_rules`: outcome first, short sentences, active voice, terms defined at first use, glossary vocabulary over synonyms, replies in the user's language with code identifiers quoted verbatim, and English-only word lists never applied to other languages.
- Added `.vibekit/docs/CONTEXT.md`, a trilingual (en/vi/zh) project glossary for the kit repo wired to `backbone.yml` `project.context`, so re-pitches and prose share one vocabulary across languages; end-user projects keep scaffolding their own from `CONTEXT_TEMPLATE.md`.

### Validation

- `npm test` and `npm run security:probe` passed after the integration; skill counts, localized README markers, manifest-driven mirrors, and package contents updated to 22 skills.

## 0.5.9 - 2026-08-07

### Added

- Added an OpenCode profile with root `AGENTS.md`, the shared `.agents/skills` registry, native `.opencode/commands`, a seed-only guarded `opencode.json`, installer and doctor support, AgentShield inventory, package inclusion, and OpenCode-only acceptance coverage.

- Added a dependency-free Codex routing-plan and receipt-binding validator. It converts trusted live inventory into exact model, reasoning, role, profile-pin, capability, quality, and fallback decisions, then fails closed on stale inventories, unavailable models, profile-pin conflicts, full-history override conflicts, and missing or mismatched effective-model receipts without invoking providers or claiming to authenticate caller-supplied JSON.

### Changed

- Hardened generic installer and updater destinations against existing and dangling symlinked project paths, including OpenCode configuration and command paths.

- Clarified that orchestration preferences are not dispatch, runtime-specific safety floors remain the parent's responsibility, custom-agent pins outrank explicit spawn values, global `[agents]` settings are fallbacks rather than per-role routing, and unavailable control-plane attestation must be reported as `requested-not-attested`.

### Fixed

- Bound effective-model receipts to the exact child id returned by the spawn call, preventing a receipt from another identical routing plan from satisfying verification.
- Registered OpenCode in remembered Custom assignments and Auto inventory guidance, and corrected doctor reports so shared `.agents/skills` count only for active Codex or OpenCode surfaces.

### Validation

- `npm run validate:all` passed with zero validator failures or warnings, 45 orchestration routing checks, dangling-symlink install and update regressions, a clean deterministic AgentShield probe, and all 936 on-disk skill files included in a 1,050-file npm tarball.

## 0.5.8 - 2026-08-05

### Added

- Added `clean-delivery` across Claude, Cursor, Codex, Grok, and Kimi. The optional workflow treats Specify, Code, Clean, Architect, Harden, and Verify as proportional craftsmanship gates rather than mandatory agents, with a deterministic story validator, protected verification assets, risk-tier evidence, and Proofline-compatible returns.
- Added a provider-neutral Default, Auto, and Custom orchestration preference contract. Parent agents prefer native structured questions, child agents return `needs_user_input`, remembered choices reuse `.vibekit/preferences.json`, and a dependency-free helper validates project-local assignments without probing credentials or executing providers.
- Added an optional `commands.verification` contract to backbone schema version 4 with named unit, acceptance, architecture, property, mutation, and e2e command-or-null fields. Initializers infer existing scripts only, old schema version 3 backbones remain valid, and null never means passed or triggers tool installation.
- Added practical Korean, German, and Bulgarian README translations with synchronized navigation, npm package inclusion, and deterministic validation coverage.
- Added a language-matched author star request directly below the introductory tagline in all seven READMEs.
- Added a plain-language Clean Delivery guide to all seven READMEs, following the Proofline teaching structure with a six-gate analogy, benefits, use and skip criteria, a fail-closed workflow, starter prompt, real metric-validation example, and executable story checks.

### Changed

- Updated skill discovery, five-surface mirrors, commands, package contents, localized documentation, and deterministic validation for 21 canonical skills and 16 Cursor skills.
- Reworked `parallel-analysis`, graph orchestration, Proofline, autoresearch delegation, Clean Delivery, and `/council` to separate provider routing from plan-only, sequential, countercheck, or verified-graph safety topology. Auto mode routes only across ready adapters and never guesses model aliases, authentication, prices, or availability.

### Fixed

- Required autoresearch metrics to parse as finite numbers before ledger writes, rejecting NaN, infinities, overflow, and arbitrary text without mutating existing results.
- Rejected shell operators, expansion markers, globs, and leading environment assignments in legacy autoresearch command strings with an argv migration message, preventing silent changes to metric semantics.
- Hardened Clean Delivery story validation against duplicate required headings, untouched template placeholders, placeholder proof commands, and unconfigured red evidence.
- Made Autoresearch and Clean Delivery resource validation report incomplete installations through the normal failure summary instead of uncaught filesystem exceptions.
- Synchronized all four README skill mindmaps with the documented 21-skill catalog and added `clean-delivery`.
- Removed duplicate `themeVariables` mappings from the Vietnamese, Chinese, and Japanese Proofline diagrams, then added Mermaid skill guidance and a duplicate-key regression gate for authored diagrams.
- Reworked all seven Clean Delivery guides with plain-language gate conditions, explicit stop behavior, detailed localized evidence flowcharts and legends, annotated starter prompts, risk tables, concrete walkthroughs, and visible glossaries.

### Validation

- `npm run validate:all` passed with zero validator failures or warnings, the complete install matrix, 32 Autoresearch checks, 7 Clean Delivery story checks, all 177 Tutien checks, all 42 graph-renderer checks, all 37 Proofline sandbox checks, and no built-in suspicious AgentShield markers. The package dry-run included all 926 on-disk skill files in a 1,039-file tarball.

## 0.5.7 - 2026-08-03

### Added

- Added `proofline-orchestration` across Claude, Cursor, Codex, Grok, and Kimi with the original `Keeper`, `Wayfinder`, `Countervoice`, and `Maker` vocabulary. The workflow gives independent challenge an explicit evidence contract, typed signals, preserved dissent, protected acceptance oracles, and auditable Proof Returns.
- Added `/proofline`, four project-scoped Codex custom agents, and four optional Codex profile templates. The templates declare conservative sandboxes, while effective runtime probes decide whether role boundaries are enforceable.
- Added an optional, manual Paseo custom-provider fragment with official-source compatibility notes and security caveats. The kit does not install Paseo, pin models, store credentials, or edit user-level runtime configuration automatically.
- Added a dependency-free Proofline ledger validator, fenced scope and protected-action policy simulators, a bound authentication example, and an adversarial sandbox harness covering authority, replay, role transitions, budgets, liveness, safe non-final states, protected oracles, evidence safety, post-verification drift, and shared-state seal consumption.
- Added a localized Vivid Clay Mermaid workflow and step-by-step Proofline guide to all four READMEs.
- Added complete Japanese documentation in `docs/README.ja.md`, with localized diagrams, synchronized language navigation, validator coverage, and npm package inclusion.

### Changed

- Reworked the localized Proofline README guide around a house-renovation analogy, practical benefits, clear use and skip criteria, a copy-ready first prompt, one authentication example, a short glossary, and a smaller eight-node workflow diagram for technical and non-technical readers.
- Hardened Proofline with separate mutation and final-action grants, unsigned-only contract freezing, canonical timestamps, authenticated signal chains, immutable manifests, independent verifier ownership, command and tree digests, capability canaries, bounded deliberation, typed per-lane budgets, fenced integration, safe-stop rules, sensitive-evidence policy, runtime attestations, trusted validator controls, and explicit irreducible limits.
- Clarified that profile sandbox declarations are not runtime proof. Effective probes must fail closed, and unavailable controls force sequential or plan-only operation.
- Updated skill discovery, five-surface mirrors, package contents, localized documentation, and deterministic validation for 20 canonical skills and 15 Cursor skills.

### Validation

- `npm test` passed with every install profile, zero kit-validator failures or warnings, all 177 Tutien checks, all 42 graph-renderer checks, and all 37 Proofline sandbox checks. The install harness also proves target-modified Proofline and AgentShield scripts are rejected without execution. The deterministic AgentShield probe found no built-in suspicious markers, and the package dry-run included all 884 on-disk skill files in a 989-file tarball.

## 0.5.6 - 2026-07-31

### Added

- Added the dependency-free `threat-model-security-review` skill across Claude, Cursor, Codex, Grok, and Kimi. It reviews application source and diffs through repository-specific threat models, explicit coverage, source-to-sink attack paths, evidence statuses, bounded severity and confidence, proof gaps, and one-finding-at-a-time remediation.
- Added reusable threat-model, finding-report, and runtime-validation-safety references. The workflow is dependency-free and does not install or invoke external security scanners, plugins, CLIs, SDKs, MCP servers, containers, or cloud services.

### Changed

- Documented separate application-security and agent-surface review domains. `threat-model-security-review` handles application code, while `agentshield-security-review` remains the workflow for agent configuration and execution surfaces.
- Added deterministic validation for the new skill's five-surface resource parity, domain boundary, evidence statuses, review-time execution limits, remediation discipline, and package discovery.
- Updated `the-creator` across Claude, Cursor, Codex, Grok, and Kimi to begin every invocation respectfully with the attributed Pablo Picasso quotation, then continue immediately with the selected workflow.

### Fixed

- Made explicit Creator levels strict inputs: invalid, fractional, ambiguous, or conflicting levels now require clarification instead of being silently changed, while valid explicit levels are preserved unless the user approves a lower level.
- Added deterministic validation for the Creator opening quotation, attribution, ordering, and explicit-level handling.

### Validation

- `npm run validate:all` passed with zero validator failures or warnings, every install profile, all 177 Tutien checks, all 42 graph renderer checks, a clean deterministic AgentShield probe, and all 800 on-disk skill files included in an 897-file npm tarball.

## 0.5.5 - 2026-07-30

### Added

- Added append-only result lineage and bounded context-projection guidance to `graph-engineering-verified-orchestration` across all agent mirrors. Provenance relations remain separate from scheduling dependencies, while reduced worker context must retain authority, scopes, gates, budgets, verifier contracts, conflicts, and known uncertainty.
- Added deterministic regression coverage that compares the optimized critical-path traversal with a brute-force oracle across 200 generated DAGs.

### Changed

- Optimized graph critical-path traversal to store path lengths and parent links, and reused one deterministic wave grouping helper across Mermaid, ASCII, and ASCII 3D rendering.
- Documented renderer performance diagnosis, format selection, cache identity, and the requirement to validate the canonical ledger before mutable execution.
- Codex install and update now assign MVCK-owned manifests a normalized project-scoped plugin name. Long and non-ASCII folder names receive bounded deterministic names that remain valid under Codex's 64-character plugin-name limit.

### Fixed

- Preserved unrelated project-owned `.codex-plugin/plugin.json` files during install and update. Install replaces one only when `--force` is explicit, while MVCK-owned manifests still migrate automatically and are backed up during update.
- Added validation that Codex plugin names are bounded lowercase hyphen-case and that package, Codex plugin, and README badge versions remain synchronized.

### Validation

- `npm run validate:all` passed with zero validator failures or warnings, all 177 Tutien checks, all 42 graph renderer checks, a clean deterministic AgentShield probe, and all 770 on-disk skill files included in an 867-file npm tarball.

## 0.5.4 - 2026-07-29

### Added

- Added `the-creator` across Claude, Cursor, Codex, Grok, and Kimi. Its ten cumulative creativity levels each relax one additional 10% category of eligible conventions for art, design, interfaces, methods, processes, systems, and other invention, while an immutable floor preserves instruction precedence, safety, authorization, evidence, accessibility, validation, and functional acceptance.
- Added explicit `humiliation=0..10` control to `/tutien` across all mirrors. Level 0 disables fictional humiliation; levels 1-10 progressively increase directness, sarcasm, fictional status pressure, defeat, and loss of face for the cultivation role. Nonzero levels imply the direct duel register, require revocable session consent, and fail closed under neutral tone, sensitive context, non-clear policy, disabled villains, insufficient evidence, invalid input, or Tutien exit.
- Added abstract response-shape guidance to `/tutien`, varying seven composition dimensions without storing user text or reusable prose. Adjacent briefs must differ in at least two dimensions while preserving facts, policy, privacy, literal technical content, and chronicle continuity.
- Added a width-aware `--format=ascii-3d` graph view for Cursor CLI, Claude Code, Codex CLI, Grok CLI, Kimi CLI, and plain terminals. It derives topological depth, renders portable pseudo-3D node boxes, numbers every artifact edge, marks the structural critical path, explains blockers, escapes unsafe terminal labels, rejects unknown state, and falls back to a wrapped compact ledger on narrow or dense graphs. Mermaid output separately encodes graph delimiters, removes bidi controls, and pins strict security mode.
- Added a native Kimi Code CLI surface: `.kimi-code/skills/` mirrors all 18 skills (Kimi Code's project-level brand skills directory per the official `kimi-code` discovery order, with the generic `.agents/skills/` also discovered), `.kimi-code/README.md`, a `kimi` install/update profile in `mvck.mjs` (included in `all`), and registration across `skills-manifest.json`, `validate-kit.mjs`, `test-install.mjs`, `backbone.yml` `agent_surfaces`, npm package files, and the English, Vietnamese, and Chinese docs. Kimi Code already loads the root `AGENTS.md` at project level, so existing installs keep working without changes.
- Added a deterministic graph renderer to `graph-engineering-verified-orchestration` (all mirrors): `scripts/render-graph.mjs` turns a graph ledger JSON into a styled Mermaid flowchart for app surfaces or ASCII views for CLI terminals, with schema, duplicate-id, unknown-edge, and cycle validation plus a deterministic critical path. `references/graph-visualization.md` documents the rendering contract; 39 offline checks cover the renderer.
- Added a writing-style guardrail banning emoji and em/en dashes in generated prose: `.cursor/rules/050-writing-style.mdc` (always-on), `.claude/rules/writing-style.md`, `.grok/rules/writing-style.md`, an `AGENTS.md` managed-block section, and a `backbone.yml` `custom_rules` entry.
- Added response-format rules across the Claude, Cursor, and Grok rule surfaces plus the `AGENTS.md` managed block (which also covers Codex and Kimi): outcome-first answers with short main points, decision tables with the fixed columns Option, What it does, Cost, Risk, Recommended, and a Done / Next / Decision needed status block at the end of multi-step work, registered in `backbone.yml` `custom_rules`.
- Added proportional-effort rules on the same surfaces: one-line task triage (trivial, small, medium, large) with matching process weight so review never costs more than the change itself, a ban on heavy loops (parallel-analysis, graph orchestration, multi-agent review, visual, e2e) for trivial or small tasks, and a 0-6 scored gate that requires explicit user approval before any `visual-design-loop` or e2e run.

### Changed

- `/tutien` now keeps an unmistakable, language-matched cultivation-novel voice across every user-facing reply while active, including ordinary coding work and progress updates. Eligible villains use cutting, evidence-bound sarcasm automatically; final responses remain agent-authored from project facts and may not reuse the deterministic ledger's fixed structure or prose.
- The graph renderer's Mermaid output now follows the mermaid skill's Vivid Clay preset instead of a partial theme block (all mirrors): full universal frontmatter (primary/secondary/tertiary tokens), rounded status-colored nodes, a paper-tint `wave` class on wave clusters, `linkStyle default` edge styling, `<br/>` wrapping for labels longer than 24 characters, and only the classDefs that are actually assigned. Inline class and link styling keeps diagrams legible on hosts that ignore frontmatter themeVariables, such as forced dark themes. `references/graph-visualization.md` and the skill's visualize section now name the preset as the style source; renderer checks grew from 39 to 41.
- The graph renderer's default `--format=both` output now pairs Mermaid with ASCII 3D instead of the legacy ASCII wave list. Consumers that require the previous schedule-first text can request `--format=ascii` explicitly.
- `validate-kit.mjs` now derives mirror surface directories and the frontmatter scan list from the manifest's own `surfaces` map instead of hardcoded lists, so a surface registered in `skills-manifest.json` cannot drift from mirror validation.
- `mvck doctor` is now read-only by default: it no longer executes `validate-kit.mjs` or the AgentShield probe from the target repository unless the new `--run-repo-checks` flag is passed. The report and the JSON output mark the checks as present but not executed.
- The Kimi surface directory follows the current Kimi Code CLI product layout (`.kimi-code/` instead of the older Kimi CLI `.kimi/`), matching the official discovery order now that the older CLI repository is being wound down.
- The `AGENTS.md` visual design loop trigger no longer says "always use": it scores the need 0-6 and requires user approval at 5-6 before any loop starts; the `visual-design-loop` skill adds the same gate to its contract on all mirrors.

### Fixed

- Fixed `/tutien` leaking internal consent labels such as `vai tu sĩ`, `vai diễn hư cấu`, or `avatar` into Vietnamese role-play. The response brief now marks those labels as metadata-only and uses `đạo hữu` as the default visible second-person address, while allowing an already-established in-world title.
- The graph renderer rejects node ids that collide after Mermaid id sanitization (for example `A-B` and `A_B` both became `A_B` and collapsed into one rendered node).
- The graph cycle CLI test writes its fixture to a unique temporary directory instead of overwriting and permanently deleting the fixed path `fixtures/cyclic-graph.json`.
- `.cursor/cli.json` ships a read-only `permissions.allow` list next to the existing `deny` list so non-interactive Cursor CLI runs can execute read-only commands without prompting.

### Validation

- `npm run validate:all` passed with zero validator failures or warnings, all 177 Tutien checks, all 41 graph renderer checks, a clean deterministic AgentShield probe, and all 770 skill files on disk included in a package tarball of 867 files.
- Synchronized release version `0.5.4` across package metadata, Codex plugin metadata, and all three README badges.

## 0.5.3 - 2026-07-27

### Added

- Added `graph-engineering-verified-orchestration` as a portable user-invoked skill across the canonical, Claude, Cursor, Codex, and Grok surfaces. It converts large work into bounded artifact dependency graphs with critical-path checks, enforceable state and semantic isolation, protected verification oracles, resource/retry budgets, rollback semantics, exact human gates, and accepted-only merging.
- Added a reusable graph contract covering plan-only versus execute authority, node/edge/state ledgers, risk and blast radius, verifier effects, immutable input/graph digests, bounded discovery, cleanup, partial results, and irreversible R2 handling.

### Changed

- Documented the skill in the English, Vietnamese, and Simplified Chinese READMEs with a Vivid Clay Mermaid flow. Updated skill counts and install guidance without hardcoding provider-specific concurrency or pricing claims.
- Added a collapsible "Read more: a real example" case study to the graph-engineering section of all three READMEs - a three-service logger migration explaining when, where, and why to use the skill (and when not), with an example prompt and a localized Vivid Clay case-graph diagram whose edges carry named artifacts.

### Validation

- Added permanent validator gates for artifact-edge economics, authority separation, exact approval binding, enforced isolation, verification-oracle protection, bounded failures, localized discovery, Mermaid legibility, and package inclusion. The deterministic validator grew from 598 to 635 passing checks with zero failures or warnings.

## 0.5.2 - 2026-07-26

### Added

- Added a `mermaid` skill (canonical + Claude/Cursor/Codex/Grok mirrors) that generates styled Mermaid diagrams for all 31 diagram types with per-type syntax references, the Vivid Clay preset, and a rendered `preview.html` verification page. Vetted and integrated via `/claim` from a user-supplied local skill clone; foreign plugin contracts were removed, while the imported Mermaid documentation retains upstream authorship and its MIT notice in `UPSTREAM-NOTICE.md`. The source clone's eval harness was intentionally not imported.
- Added kit-specific mermaid behavior: diagram density and type choice adapt to the active `/coding-level` (`references/coding-level-charts.md`); document generation offers a one-time "include diagrams? yes/no"; debugging offers a workflow chart with red/amber suspicion zones that pinpoint the likely bug location (`references/debug-heatmap.md`).
- Added a strong color palette for large-area marks to the Vivid Clay preset and fixed the three weakest chart types: timeline no longer shows clashing auto-inverted accent underlines (`cScaleInv` pinned to ink), kanban uses a Mermaid 11.16-render-verified `cScale2`-`cScale5` compatibility mapping plus `priority` metadata, and xychart ships a bold colorblind-safe blue/orange plot palette with data labels for bars.

### Changed

- Visualized all three READMEs (English, `docs/README.vi.md`, `docs/README.zh-CN.md`) with three Vivid Clay Mermaid flowcharts each - the Quick Start approval flow, "How the pieces connect" (replacing the ASCII sketch), and the autoresearch contract loop. Diagram labels follow each document's language on the Vietnamese-safe mono font stack.
- Led the Guide, Commands, and Skills sections of all three READMEs with section visuals - a day-to-day usage flowchart, a command-lifecycle flowchart, and a 16-skill category chart - and collapsed each section's original list or table behind a localized "Read more" / "Xem thêm" / "查看更多" toggle, matching the existing Troubleshooting pattern.
- Fixed GitHub dark-mode legibility of the README diagrams after screenshots showed ink frontmatter titles vanishing on the transparent canvas and unreadable mindmap labels: removed the `title:` line from every README diagram (section headings already name them) and replaced the 16-skill mindmap with a four-column subgraph flowchart whose classDefs pin every label's fill and text color.
- Extended the Vivid Clay preset (all five skill mirrors) with a theme-following-hosts section: omit frontmatter titles on hosts like GitHub that render on a transparent theme-following canvas, documented that Mermaid 11.16 mindmaps ignore pinned `cScaleLabel` values (third timeline/mindmap/kanban trap), added the flowchart catalog pattern as the dark-safe alternative, and added a matching legibility-checklist gate.
- Enhanced the `sequential-thinking` skill with a closed public-checkpoint vocabulary (`[REVISION]`, `[BRANCH]`, `[HYPOTHESIS]`, `[VERIFICATION]`, `[CONVERGENCE]`, `[META]`, `[FINAL]`), a hypothesis→verification debugging loop, dynamic expand/contract totals, revision-cascade reassessment, and explicit/implicit application modes. Replaced pseudo-MCP runtime claims and long thought transcripts with concise evidence summaries and kit-native cases.
- Added kit-authored Mermaid cases for safe configuration promotion, repository safety evolution, localization release work, validation feedback time, and duplicate-webhook debugging. Updated the executable gallery to the strong palette and corrected high-risk red text to an AA-compliant 5.75:1 contrast.
- Reconciled the imported Mermaid reference snapshot with its executable Mermaid 11.16 boundary: local links now resolve, upstream links are immutable, unavailable development-only syntax is explicitly marked, and the exact preserved MIT license remains in `UPSTREAM-NOTICE.md`.
- Pinned optional AgentShield invocations to `ecc-agentshield@1.4.0`, made package execution approval-aware, and expanded the deterministic local probe to cover the kit's complete agent-surface file set.
- Added permanent validator gates for sequential-thinking's public contract, Mermaid mirror parity and strict-mode examples, local reference links, runtime pins, unavailable-syntax warnings, visual-palette invariants, and AgentShield command pinning.

### Validation

- Registered the new skill and references in `skills-manifest.json`, the validator's required-file registry, and the npm `files` manifest. The initial aggregate suite grew from 708 to 764 passing checks; the second-pass deterministic validator grew from 565 to 598 checks. `npm run validate:all` passes, including installer sandboxes, all Tutien suites, the local AgentShield probe, and an npm dry-run containing all 589 on-disk skill files.
- Synchronized the release version to `0.5.2` in `package.json`, `.codex-plugin/plugin.json`, and all three README badges.

## 0.5.1 - 2026-07-22

### Added

- Added a `/tutien` living chronicle that turns each repository's approved aggregate Git, token, classification, and progression evidence into an open-ended agent-authored xianxia serial. Each project keeps a local `plot.md`, continuity state, aggregate-only context, and one ordered chapter file per distinct evidence window under the git-ignored `.vibekit/reports/tutien/story/` directory.
- Added equal chronicle support for Vietnamese, English, and Simplified Chinese, including language-native xianxia naming, honorifics, dialogue cadence, humor, chapter titles, and safely sarcastic antagonists whose malice targets workflow weaknesses rather than people.
- Added `story-ledger.mjs` and deterministic tests for multilingual filenames, aggregate-only context, contiguous chapters, duplicate evidence rejection, and story transaction validation.

### Changed

- Reframed `/tutien` story writing as an evidence-plus-agent hybrid: deterministic scripts preserve facts and privacy, while agents create project-specific plots, characters, sects, realms, techniques, and dialogue without relying on fixed story sentences.
- Replaced the fixed report-shaped default response with an aggregate-only `latest-brief.json` handoff. It detects safe project anchors from known manifests, recommends real repository validation commands, and leaves structure, pacing, scene, dialogue, and closing imagery to the agent; `output=ledger` preserves the deterministic audit view.
- Expanded the cultural reference notes into a verified, genre-level writing palette covering path/learning metaphors, classical journey traditions, modern web-serial progression, daily-life cultivation, clan/sect epics, and cultivation-game procedural structure without imitating named living authors.

### Security and privacy

- Living-chronicle context persists only project slugs and aggregate metrics. Raw prompts, event IDs, commit subjects, contributor identities, URLs, secrets, and source-file contents remain excluded from context, state, plot, and chapters.

### Validation

- Expanded `/tutien` coverage to **158 deterministic, offline checks**, including project-profile privacy, response-brief composition, living-chronicle, preference sanitization, manifest-bound approval, optional ledger output, and on/off suppression.
- Synchronized the release version to `0.5.1` in `package.json`, `.codex-plugin/plugin.json`, and all three README badges.

## 0.5.0 - 2026-07-20

### Added

- Added `/claim <request>` across Claude Code, Cursor, Codex, and Grok. It validates official sources, rejects unsafe or misleading URLs, checks new ideas against `backbone.yml` and existing repository conventions, stops for decisions when approval is required, and integrates only the smallest reviewed change with an evidence ledger.
- Added `/tutien`, a private, user-invoked xianxia coding-classification game built from Git history and explicitly supplied conversation exports. It provides deterministic vi/en reports, ten cultivation realms, evidence-bound workflow coaching, optional aggregate snapshots, progress comparisons, and opt-in antagonists that challenge workflow patterns rather than the person.
- Added `/tutien classify` with independent Dao faction, affiliation, and technical-path axes; a cultivation-knowledge taxonomy linked to real kit skills; and seven deterministic, token-independent progression metrics.
- Added complete Simplified Chinese documentation (`docs/README.zh-CN.md`) alongside English and Vietnamese, with synchronized language navigation and npm package inclusion.

### Changed

- Refined `/tutien` with the cross-model namespace `tutien-coding-cultivation-v1`, calm `serene`/`spirited` narration, plain evidence beneath the lore, and reliable English/Vietnamese stop requests that restore the kit's normal writing style. Legacy `gentle`/`spicy` tone values remain compatible.
- Centralized skill distribution in `.vibekit/skills/skills-manifest.json`, keeping canonical skills, tool mirrors, installer registries, validator registries, package contents, documentation, and per-profile tests synchronized.
- Strengthened `/claim` with canonical redirect validation, HTTPS-only remote evidence, private-host and confusable-domain rejection, untrusted-content handling, explicit approval states, separate approval for integration-time execution, and a complete distribution checklist.
- Strengthened `/tutien` with one fail-closed policy state shared by rendering and persistence, idempotent event progression, boundary-aware path matching, metadata-only classification scope, and explicit authorization handling for legitimate dual-use security work.

### Security and privacy

- `/tutien` remains offline and read-only during analysis. Raw prompts, secrets, author names, email addresses, and commit subjects do not enter reports or snapshots; stored history uses salted digests and aggregate evidence.
- Ambiguous, unauthorized, or declared-stop classifications suppress scores, realms, villains, recommendations, and positive progression. The game evaluates workflow evidence (not a person's identity, worth, health, or wellbeing) and stays isolated from unrelated support or companion modes.
- `/claim` treats fetched pages as untrusted data and never runs remote installers, lifecycle scripts, or source-provided commands during research.

### Validation

- Expanded `/tutien` coverage to **133 deterministic, offline checks**, including adversarial privacy, token-integrity, policy-state, replay-idempotency, namespace-isolation, natural stop-request, and end-to-end approval-boundary cases.
- `pack-dry-run.mjs` now parses `npm pack --dry-run --json` and fails with the exact missing path when an on-disk skill file is absent from the package.
- Synchronized the release version to `0.5.0` in `package.json`, `.codex-plugin/plugin.json`, and both README badges.

## 0.4.2 - 2026-07-18

- Added a Grok Build (Grok CLI) surface across the kit: `.grok/rules/` (always-on, every `*.md` loaded), `.grok/skills/` (all 13 kit skills, user-invocable as `/<skill-name>`), `.grok/README.md`, and project-scoped `[permission]` deny rules in `.grok/config.toml` mirroring the kit's dangerous-command deny list; `config.example.toml` documents the user-level `~/.grok/config.toml` settings. Added a `grok` install/update profile to `mvck.mjs` (included in `all`) and registered Grok everywhere Claude/Cursor/Codex already were: `validate-kit.mjs`, npm package files, `backbone.yml` `agent_surfaces`, `AGENTS.md`, the AgentShield probe, both READMEs, `INSTALL.md`, `BACKBONE_REFERENCE.md`, `CONTEXT_TEMPLATE.md`, `FIRST_TIME_INIT.md`, and `vibekit-init`.
- Added `prompt-sharpener` skill (shared + Claude/Cursor/Codex/Grok mirrors), an English rewrite of a collected `sharpen` skill: `/prompt-sharpener <rough prompt>` diagnoses a raw prompt against a defect checklist (vague verbs, mixed tasks, missing success criteria, unbounded scope, missing output format), rebuilds it as a sharper prompt (`Objective` → `Context` → `Work Style` → `Tool Rules` → `Output Contract` → `Verification` → `Done Criteria`), prints it in one code block, then executes it in the same turn.
- Corrected the dangerous-command guardrails after a cross-tool documentation review. Removed the pipe-spanning `curl *|*sh` / `wget *|*sh` deny rules from `.claude/settings.json` and `.cursor/settings.json` - Claude Code evaluates each piped subcommand independently, so they never matched - in favor of denying bare shell interpreters (`sh`, `bash`, `zsh`, and their `-` stdin forms, which is what `curl ... | sh` actually executes), and fixed the `npx` rules to also cover the common leading `--yes`/`-y` forms.
- Added each tool's actual documented project-level permission mechanism, since only Claude Code and Cursor's Claude-schema file had one before: `.cursor/cli.json` with `Shell(...)` rules for Cursor CLI (the real mechanism Cursor reads; the Claude-schema `settings.json` is kept only as reference), experimental `.codex/rules/vibekit.rules` execution-policy rules for Codex (`forbidden` decisions with `match`/`not_match` fixtures, active once the project `.codex/` layer is trusted), and the `.grok/config.toml` rules above.
- `validate-kit` now lints deny lists for pipe-spanning patterns and missing leading `npx --yes`/`-y` coverage, and is profile-aware: per-surface files are required only when that surface is installed (the kit source repo still validates everything), so a `claude`-only or `grok`-only install passes its own validation; `test-install` runs an install+validate cycle for each single profile.
- `mvck update` treats `.cursor/cli.json` and `.grok/config.toml` as user-owned (seeded once, never overwritten). The AgentShield probe's suspicious-marker scan now skips lines inside permission `deny` arrays, so the kit's own deny rules no longer flag themselves as suspicious; allow/ask blocks are still scanned.
- Synced version to 0.4.2 in `package.json`, both README badges, and `.codex-plugin/plugin.json`.

## 0.4.1 - 2026-07-17

- Added a safe-delete guardrail across all three surfaces: new `.claude/rules/safe-delete.md` and `.cursor/rules/040-safe-delete.mdc` (always-on), a `### Safety` bullet in the `AGENTS.md` managed block for Codex, and a trash-first outcome in the `path-sensitive-shell-safety` skill (all mirrors). Agents prefer the recoverable `trash` command over `rm`, check `command -v trash` first, and recommend an install when missing (macOS 14+ built-in; older macOS `brew install trash`; Linux `sudo apt install trash-cli`; any OS with Node `npm i -g trash-cli`). `rm` was already deny-listed for Claude Code and Cursor in the kit settings.
- First-time init now asks two setup preferences and records them in `backbone.yml` `conventions.custom_rules`: use `trash` instead of `rm` (with availability detection and install hints), and a default coding level chosen from a 0-5 table with one-line descriptions. Mirrored in the `init-backbone.mjs --propose` interview output.
- `coding-level` skill (all mirrors): sessions now start from the `Default coding level: N` entry in `backbone.yml` when present; `/coding-level N` still overrides per session and can save a new default with approval. `CLAUDE-template.md` now lists `/coding-level` and the safe-delete rule.
- `mvck doctor` reports a new safe-delete check: whether the `trash` command is available, with the per-OS install hint when it is not.
- Fixed the npm package page rendering the Vietnamese README: moved `README.vi.md` to `docs/README.vi.md` so npm's readme detection always picks `README.md`.
- Added an "Install from npm" section to `README.md`, `docs/README.vi.md`, and `.vibekit/docs/INSTALL.md`: one-shot `npx --yes minimal-vibe-coding-kit@latest install <path>`, or `npm i -D minimal-vibe-coding-kit` followed by `npx mvck install .`, with a note that files in `node_modules/` stay inactive until `mvck install` copies them into the repo root.
- Switched README install/update/profile examples to the published npm package; the `github:` form and local `install.sh` remain documented as alternatives.
- Synced version to 0.4.1 in `package.json`, both README badges, and `.codex-plugin/plugin.json`; added an npm badge.

## 0.4.0 - 2026-07-16

- Trimmed the end-user install payload: `mvck install`/`update` no longer copy kit-maintainer files (`test-install.mjs`, `pack-dry-run.mjs`, `.vibekit/docs/RESEARCH_NOTES.md`, `.vibekit/docs/AUTORESEARCH_LEDGER.md`); `validate-kit` requires them only in the kit source repo.
- `mvck install`/`update` now reject unknown `--profile` values instead of silently installing shared files only.
- `install.sh` no longer misreads a leading flag as the target directory.
- Fixed stale pre-0.4 path references: `.codex-plugin/plugin.json` now points at `./.vibekit/skills/` (version synced to the kit), the AgentShield probe scans `.vibekit/skills`/`.claude/skills`/`.cursor/skills`, and autoresearch/agentshield skill docs use `.vibekit/skills` in editable-path examples.
- Added `parallel-analysis` to the AGENTS.md "Skills to prefer" list.
- Broadened CI PR path filters to cover `install.sh`, `install.ps1`, `.vibekit/init/**`, and `.vibekit/docs/**`.
- Rewrote `README.md` and `README.vi.md`: short Quick Start, end-user install topology, day-to-day guide, full commands/skills tables (now including `/vibe-finalize` and `parallel-analysis`), and an Advanced section; version badge synced to the package version.

- BREAKING: consolidated all kit-owned files into a single `.vibekit/` folder - `.vbkit-scripts/` -> `.vibekit/scripts/`, `.vbkit-commands/` -> `.vibekit/commands/`, `.vbkit-docs/` -> `.vibekit/docs/`, `skills/` -> `.vibekit/skills/`, and one-time onboarding files (`FIRST_TIME_INIT.md`, `FIRST_PROMPT.md`, `CLAUDE-template.md`, `PUSH_TO_GITHUB.md`) -> `.vibekit/init/`. User repos now get one kit folder plus the harness surfaces (`.claude/`, `.cursor/`, `.agents/`, `.codex/`, `.codex-plugin/`) and root entrypoints (`backbone.yml`, `AGENTS.md`, `CLAUDE.md`). `mvck install`/`update` print an advisory legacy-layout note (never auto-delete) when pre-0.4 paths are found.
- Added `parallel-analysis` skill (shared + Claude/Cursor/Codex mirrors): fan out 2-5 read-only analysis lanes via Cursor CLI Composer (recommended), Claude subagents, or Codex CLI, then merge and verify findings; first use asks for the provider/model once and persists it to `.vibekit/parallel-analysis.json`.

- Added `memento` skill (cross-session `MEMENTO.md` working memory) across shared, Claude, Codex, and Cursor surfaces.
- Added `coding-level` skill (explanation register 0=ELI5 … 5=expert peer, with per-level reference personas) across shared, Claude, Codex, and Cursor surfaces.
- Added safe updater: `mvck update` refreshes kit-owned files (skills, commands, rules, scripts, docs, agent mirrors), seeds user-owned files only when missing, refreshes managed blocks in place, backs up replaced files to `.vibekit/update-backup/<timestamp>/`, and supports `--dry-run`, `--json`, `--no-backup`, and `--profile`.
- Stamped installed kit version in `.vibekit/KIT_VERSION` on install/update; `mvck doctor` now reports it with the update command.
- Added update-behavior tests (stale-file refresh, new-skill backfill, user-file preservation, backup creation, non-kit target rejection).
- Hardened installer managed-block fallback when template markers are missing.
- Fixed `mvck init|validate|daily` delegation so flags are preserved when target is omitted.
- Added install/idempotency tests with temporary clean and existing repos.
- Added `mvck doctor` with optional `VIBE_REPORT.md` generation.
- Added dependency-free `backbone.yml` schema validation and `.vibekit/docs/backbone.schema.json`.
- Added a portable Node wrapper for the AgentShield probe.
- Added syntax checks, `npm test`, CI Node 18/20/22 matrix, and package dry-run verification.
- Added release safety docs and Dependabot config.
- Promoted `clearthought`, `sequential-thinking`, and `reviewing-4p-priorities` as native custom reasoning skills across shared, Claude, Codex, and Cursor surfaces.
- Added first-time convention discovery so init proposals include repo-specific naming, architecture, resource, localization, and generated-definition rules before approval.
- Added validation checks for mirrored skill-surface parity across shared, Claude, Cursor, and Codex paths.
- Hardened autoresearch guidance so experiment loops honor first-time init, logged baselines, metric extraction, and AgentShield review for agent-surface changes.

## 0.2.0

- Added one-command installer CLI: `mvck install <project>`.
- Added quick shell and PowerShell installers: `install.sh`, `install.ps1`.
- Added compact `backbone.yml` template and automatic backbone detection helper.
- Added clean first prompt and first-time init runbook.
- Added Claude, Cursor, and Codex support surfaces.
- Added shared skills for autoresearch coding, AgentShield security review, daily workflow curation, and kit init.
- Added AgentShield read-only repo probe.
- Added daily propose-only enhancement report.
- Added validation script and GitHub Actions validation workflow.
- Reduced root instruction boilerplate by moving details into docs and skills.
