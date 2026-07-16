---
name: path-sensitive-shell-safety
description: Guardrail workflow for shell changes that use path variables, remote base directories, repo folders, checkout repair, or destructive filesystem commands such as rm, mv, cp, rsync, find -delete, git clean, or git reset.
argument-hint: "<script path, command, or safety review target>"
user-invocable: true
effort: medium
---

# Path-Sensitive Shell Safety

Use this skill before editing or reviewing shell, deploy, installer, cleanup, or repair logic that builds filesystem paths from variables or touches remote repositories.

Common triggers:

- Path variables such as `remote_base`, `repo_dir`, `repo_folder`, `target_dir`, `backup_dir`, `worktree`, `site`, `app`, or user-entered folder names.
- Destructive or path-sensitive commands: `rm`, `mv`, `cp -a`, `rsync --delete`, `find -delete`, `docker volume rm`, `git clean`, `git reset`, checkout repair, clone replacement, or symlink-sensitive copy.
- Git sync that decides which branch or remote checkout will be deployed.

## Safety objective

No empty, unset, broad, symlinked, or unintended path may reach a destructive command. Validate values before joining paths, validate the joined path before use, and validate containment immediately before the command.

## Required workflow

1. Identify the command with the highest blast radius.
2. List every variable that contributes to its path or repository target.
3. Classify each variable:
   - trusted constant;
   - config value;
   - remote/server value;
   - user/operator input;
   - derived path.
4. Validate raw inputs before joining:
   - required and non-empty;
   - expected shape: absolute base path or safe single folder segment;
   - no traversal, newlines, glob metacharacters, leading option dash, or control characters;
   - explicit allowlist for server roots when possible.
5. Join paths with quoted expansions only. Do not use `eval`.
6. Canonicalize existing paths with physical resolution (`pwd -P` or `realpath`) before destructive work.
7. Assert containment:
   - target is inside the approved base;
   - target is not `/`, `.`, `..`, `$HOME`, the base root itself, or another broad system directory;
   - target is not a symlink unless the operation explicitly supports symlinks.
8. Put the final guard directly next to the dangerous command.
9. Use command terminators and quoting: `-- "$path"` where supported.
10. For Git sync, verify expected origin, selected branch policy, fetch success, clean worktree, fast-forward state, and final `HEAD == origin/<branch>` before build/deploy.
11. Run the repo validation command and AgentShield probe when this changes agent surfaces or automation rules.

## Required outcomes

- A blank branch may follow the documented default-branch fallback policy.
- An explicit branch must fail if missing; never silently deploy another branch.
- A blank folder/base value must fail before any `rm`, `mv`, `cp`, `rsync`, `find`, Docker, or Git cleanup command runs.
- A repair flow may move an unusable checkout to a timestamped backup only after a verified replacement exists.
- No automatic cleanup should delete backups, locks, runtime data, uploads, volumes, databases, or environment files without separate explicit confirmation.

## Review priority

Use `reviewing-4p-priorities` if triage is needed:

- P0: unsafe path command already caused data loss or can expose/delete secrets in the active environment.
- P1: unchecked empty/broad variable can reach destructive commands in deploy/repair/install paths.
- P2: guard exists but misses edge cases such as symlinks, traversal, explicit branch fallback, or wrong origin.
- P3/P4: documentation clarity or minor naming improvements after the safety invariant is already enforced.

## Reference

Use `references/workflow.md` for copy-ready guard patterns and review checklist.
