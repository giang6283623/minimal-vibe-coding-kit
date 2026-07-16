# Push this 0.2.0 repo to GitHub

Use this when you want to replace/update `giang6283623/minimal-vibe-coding-kit` with this enhanced version.

## Option A: copy into an existing clone

```bash
git clone https://github.com/giang6283623/minimal-vibe-coding-kit.git
cd minimal-vibe-coding-kit

# From inside the existing clone, copy the extracted 0.2.0 repo over it.
# Adjust the source path if you extracted the ZIP somewhere else.
rsync -a --delete \
  --exclude .git \
  --exclude node_modules \
  ../minimal-vibe-coding-kit-0.2.0/ ./

node scripts/validate-kit.mjs .
python .vibekit/skills/agentshield-security-review/scripts/agentshield_repo_probe.py .
npm pack --dry-run

git status
git add -A
git commit -m "feat: release minimal vibe coding kit 0.2.0"
git push origin main

git tag v0.2.0
git push origin v0.2.0
```

## Option B: start from this extracted folder

```bash
cd minimal-vibe-coding-kit-0.2.0
git init
git remote add origin https://github.com/giang6283623/minimal-vibe-coding-kit.git
node scripts/validate-kit.mjs .
python .vibekit/skills/agentshield-security-review/scripts/agentshield_repo_probe.py .
npm pack --dry-run
git add -A
git commit -m "feat: release minimal vibe coding kit 0.2.0"
git branch -M main
git push -u origin main
```

Only use Option B if the remote branch can accept your local history. Option A is safer for an existing repository.

## After push, test install from GitHub

```bash
mkdir /tmp/vibe-kit-test
cd /tmp/vibe-kit-test
npm init -y
npx github:giang6283623/minimal-vibe-coding-kit install .
node scripts/init-backbone.mjs . --propose
node scripts/validate-kit.mjs .
```

## Expected files in the pushed repo

```text
README.md
.vibekit/init/PUSH_TO_GITHUB.md
package.json
install.sh
install.ps1
bin/mvck.js
scripts/*.mjs
backbone.yml
AGENTS.md
.vibekit/init/CLAUDE-template.md
.vibekit/init/FIRST_PROMPT.md
.vibekit/init/FIRST_TIME_INIT.md
.claude/**
.cursor/**
.agents/**
.codex/**
.codex-plugin/**
.vibekit/skills/**
commands/**
docs/**
.github/workflows/vibekit-validate.yml
```
