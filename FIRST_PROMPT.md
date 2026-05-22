# First prompts

Use one of these after installing the kit into a project.

## Universal first prompt

```text
Read FIRST_TIME_INIT.md and initialize this repo with Minimal Vibe Coding Kit.
First print the requirements you will check. Then run detection, propose one diff for backbone.yml and managed instruction blocks, and wait for my yes before writing.
After approval, write the files, run validation, and summarize what changed.
```

## Claude

```text
Use /init-vibe. Keep CLAUDE.md short. Import shared AGENTS.md. Do not overwrite existing CLAUDE.md; append the managed block only.
```

## Cursor

```text
Read FIRST_TIME_INIT.md and .cursor/rules. Initialize backbone.yml. Do not replace existing Cursor rules; add missing Minimal Vibe Coding Kit rules only.
```

## Codex

```text
Read AGENTS.md and FIRST_TIME_INIT.md. Use the vibekit-init skill if available. Initialize backbone.yml, keep AGENTS.md concise, and wait for approval before writing.
```

## Autoresearch improvement loop for this kit

```text
Use the autoresearch-coding skill.
Goal: improve this Minimal Vibe Coding Kit for existing projects in any language.
Metric command: node scripts/validate-kit.mjs .
Direction: higher.
Editable paths: README.md docs scripts skills commands .claude .cursor .agents .codex-plugin .github backbone.yml AGENTS.md CLAUDE-template.md FIRST_TIME_INIT.md package.json install.sh install.ps1.
Protected paths: .git .env* node_modules vendor secrets lockfiles.
Budget: 3.
```

## AgentShield

```text
Use the agentshield-security-review skill. Run the read-only probe first. Then, if npm is available, run AgentShield scan. Report scanner-backed findings separately from manual judgment. Do not run hooks, MCP servers, or installer scripts just to inspect them.
```

## Daily improvement prompt

```text
Use the daily-workflow-curator skill. Run node scripts/daily-enhance.mjs . --write-report and node scripts/validate-kit.mjs . Then propose updates to skills, rules, workflows, and backbone.yml. Do not write any change until I approve a diff.
```
