# Research notes used for this enhancement

The kit follows these design decisions:

1. Keep always-loaded instruction files short.
2. Move procedures into skills because skills load only when used.
3. Provide tool-specific discovery paths instead of assuming one tool reads every folder.
4. Use a canonical shared skill body plus thin harness shims to reduce drift.
5. Run security review on agent surfaces, not only application source code.
6. Make daily improvement propose-only by default.
7. Use deterministic validation as the autoresearch metric for the kit itself.

## Autoresearch metric for this repo

```text
Goal: improve Minimal Vibe Coding Kit quality.
Metric command: node scripts/validate-kit.mjs .
Direction: higher pass count and zero failures.
Editable paths: docs, scripts, skills, commands, .claude, .cursor, .agents, .codex-plugin, .github, root templates.
Protected paths: .git, .env*, node_modules, vendor packages, secrets, lockfiles.
Budget: 3.
```
