---
description: Graduate the project after init — move one-time bootstrap files into _vibekit-cleanup/ for deletion. Reversible; refuses to run on the kit source repo.
---

# vibe-finalize

Graduate this project once init and the first prompt are complete. Run `node .vbkit-scripts/vibekit-finalize.mjs . --propose` to preview, then `--write --yes` to move one-time bootstrap files (FIRST_TIME_INIT.md, FIRST_PROMPT.md, PUSH_TO_GITHUB.md, CLAUDE-template.md) into `_vibekit-cleanup/` for deletion. It refuses to run on the kit source repo and is reversible with `--restore --write`.
