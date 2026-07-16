---
name: visual-design-loop
description: Run an iterative visual design improvement loop for UI/product polish tasks. Use when a request involves screenshots, rendering, visual review, frontend polish, layout/typography/color refinement, design QA, or a Claude/Codex loop goal that touches a visible product surface.
---

# Visual Design Loop

Use this skill to improve a visible UI through controlled render-review-fix loops. Keep the brief and existing project conventions as the source of truth; do not add new product requirements just because a screen could be enhanced.

## Contract

Before editing, resolve and state:

- Goal.
- Target surface: route, page, component, flow, or supplied screenshot.
- Source of truth: current brief plus repo instructions, design system, nearby UI, and `backbone.yml` when present.
- Render method: local URL, app command, Storybook story, preview command, static file, or supplied screenshot.
- Screenshot method: browser screenshot, Playwright, in-app browser, provided image, or equivalent.
- Editable paths.
- Protected paths.
- Budget: default 3 loops.
- Timeout: default 10 minutes per loop.
- Log path: `/tmp/design-{project_slug}.md`.

If render or screenshot capture is missing and cannot be inferred safely, ask for the missing command, URL, or image before editing.

## Baseline

1. Render the target surface.
2. Capture or inspect the baseline screenshot.
3. Review visible issues only; do not invent findings.
4. Create or update `/tmp/design-{project_slug}.md`.
5. Log the baseline screenshot, visual score, main issues, and any render constraints.

Derive `project_slug` from `backbone.yml` `project.name` when available; otherwise use the repository directory name.

## Visual rubric

Score screenshots from 1 to 5 using:

- Visual hierarchy: primary content and action are obvious.
- Layout and spacing: alignment, rhythm, density, whitespace.
- Typography: scale, contrast, readability, consistency.
- Color and contrast: accessible, intentional, not noisy.
- Component consistency: matches nearby UI and design system.
- Responsiveness: works at relevant viewport sizes.
- Interaction states: hover, focus, disabled, empty, loading, and error states when relevant.
- Product fit: improves the brief without adding unnecessary features.

## Loop

For each loop:

1. Review the latest screenshot.
2. Identify the highest-impact visual issue.
3. Form one small hypothesis.
4. Apply one targeted fix inside editable paths only.
5. Render again.
6. Capture the after screenshot.
7. Compare before and after.
8. Keep the change only if quality improves, or if quality is equal with simpler and safer implementation.
9. Revert only your own loop changes if the result is worse.
10. Run the repo validation command when code changed.
11. Append the loop result to `/tmp/design-{project_slug}.md`.

Each loop entry must include:

- Loop number.
- Screenshot reviewed.
- Issue found.
- Hypothesis.
- Fix applied.
- Before/after judgment.
- Rubric score before.
- Rubric score after.
- Validation result.
- Remaining concerns.
- Stop/continue decision.

## Stop criteria

Stop when:

- The design is polished enough for the brief.
- The latest loop gives no meaningful improvement.
- Further changes would be subjective or overworked.
- Budget is reached.
- Validation fails for a non-trivial reason.
- A product or design decision is required from the user.
- Render or screenshot tooling is unavailable.

## Final report

Report:

- Baseline score.
- Final score.
- Screenshots reviewed.
- Changes kept.
- Changes discarded, if any.
- Validation result.
- Remaining risks or design decisions.
- Log path.
