# Security rules

Use the `agentshield-security-review` skill (invocable as `/agentshield-security-review`) for changes to agent surfaces, commands, hooks, MCP, skills, or installer scripts. Do not run untrusted hooks, MCP servers, deploys, migrations, or remote installers during review.

Use the `path-sensitive-shell-safety` skill before changing shell/deploy/installer/repair logic that builds paths from variables or can delete, move, copy, replace, clean, or reset files.
