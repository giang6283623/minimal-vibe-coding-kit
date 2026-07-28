# AgentShield Manual Review Checklist

Use this checklist when `ecc-agentshield` is unavailable or when reviewing scanner output.

## Critical findings

Flag as critical when a runtime-active agent surface contains any of these:

- Hardcoded API keys, tokens, private keys, passwords, or webhook secrets.
- Unrestricted shell permissions such as `Bash` wildcard permissions, `bash -c` passthroughs, or unrestricted command execution in hooks.
- Hook command injection risk from unsanitized variables such as file paths, branch names, issue titles, PR text, or model-provided arguments.
- MCP server definitions that execute shell commands, pull remote code dynamically, or expose broad filesystem/network access without pinning or sandboxing.
- Instructions that tell the agent to ignore system/developer safety boundaries or auto-run commands from untrusted content.

## High findings

Flag as high when active config contains:

- Missing deny lists for destructive commands.
- Broad tool permissions for agents that only need read/review access.
- `npx` auto-yes flags, curl-piped-to-shell, or remote install during runtime without pinning/checksum.
- Agents that ingest untrusted web/issues/PRs without prompt-injection boundaries.
- Hooks that send repository content to remote endpoints without explicit disclosure.

## Medium findings

Flag as medium when active config contains:

- Silent failure suppression such as always-success shell fallbacks, stderr suppression, or broad `try/catch` around security checks.
- Missing descriptions for MCP servers or agent purposes.
- Duplicate Claude/Codex skill copies likely to drift.
- Lack of CI security scan for agent config changes.

## Low/info findings

Flag as low/info for documentation gaps, inactive examples, or optional templates that do not affect runtime.

## Review confidence

Use these labels:

- `active-runtime`: loaded by current harness or plugin manifest.
- `repo-template`: checked-in template that users may copy.
- `documentation-example`: not active unless copied.
- `unknown`: unable to determine loading path.
