# Optional Paseo adapter

This adapter maps Proofline roles onto current Paseo custom Codex providers. It is an integration template, not a dependency, installer, fork, or endorsement.

## Source basis

Verify the current behavior before applying the template:

- Paseo custom providers: <https://paseo.sh/docs/custom-providers>
- Paseo orchestration: <https://paseo.sh/docs/orchestration>
- Paseo worktrees: <https://paseo.sh/docs/worktrees>
- Paseo security model: <https://paseo.sh/docs/security>
- Paseo upstream license: <https://github.com/getpaseo/paseo/blob/main/LICENSE>
- Codex profiles: <https://learn.chatgpt.com/docs/config-file/config-advanced#profiles>
- Codex custom agents: <https://learn.chatgpt.com/docs/agent-configuration/subagents>

The template assumes Paseo still accepts provider entries under `agents.providers`, supports `extends: "codex"`, and replaces a provider launch prefix with the `command` array. It also assumes Codex still loads `$CODEX_HOME/<name>.config.toml` through `codex --profile <name>`. These are compatibility assumptions, not stable Proofline requirements.

Paseo upstream uses AGPL-3.0. This kit does not vendor, modify, or redistribute Paseo source. The adapter is independently authored from public configuration contracts. Assess the upstream license separately before copying or modifying Paseo code. This is an engineering boundary note, not legal advice.

## Included templates

- `../assets/paseo-config.fragment.json`: four custom provider entries.
- `../assets/codex-profiles/`: matching Codex profile overlays.

The profile files intentionally omit model names, credentials, MCP servers, and account-specific limits. They set role instructions and conservative sandbox defaults only.

## Manual integration

1. Back up your existing `$CODEX_HOME` profile files and `~/.paseo/config.json`.
2. Review every template. Do not copy credentials into the repository or into a prompt.
3. Copy each profile to `$CODEX_HOME/<profile-name>.config.toml` only after approval.
4. Merge the contents of `paseo-config.fragment.json` into the existing `agents.providers` object. Do not replace unrelated providers or top-level settings.
5. Validate JSON syntax and start each provider once with a harmless read-only task.
6. Record probed Paseo and Codex versions, an absolute or independently verified executable, the effective command, loaded profile, sandbox, approval policy, daemon address, worktree path, and canonical contract digest in a read-only control-plane record.
7. Confirm credential, network, mount, external API, port, cache, and verifier boundaries before mutable work.
8. Keep Maker and Wayfinder workspaces non-overlapping, or serialize their writes.
9. Run the bundled Proofline scenario validator before relying on the adapter for a consequential workflow.
10. Protect governance files, verifier configuration, hooks, and the control-plane record from Maker and integration writes. Do not run unreviewed hooks.
11. Launch each role with a harmless capability probe. Confirm the effective runtime denies out-of-scope writes and all mutating MCP, API, network, credential, or delegation paths for read-only roles. Profile text alone is not evidence.

Proofline never performs these global writes automatically. They affect user-level runtime configuration and require explicit user approval.

## Security boundary

- A worktree separates Git branch and directory state. It does not isolate OS user credentials, environment variables, daemon authority, network access, shared caches, databases, ports, or external APIs.
- Paseo launches agents in the daemon user's context. Scope mounts, credentials, network exposure, and provider permissions accordingly.
- Keep a direct daemon on localhost or a Unix socket unless the user deliberately configures a protected remote connection.
- If a daemon is reachable beyond localhost, follow Paseo's current authentication, encryption, host allowlist, firewall, and update guidance.
- Treat pairing material and daemon state as sensitive.
- Review setup, teardown, service, and repository scripts before execution. A worktree hook is code execution, not documentation.
- Do not assume provider labels enforce Proofline roles. Confirm the loaded Codex profile and effective sandbox.
- A parent runtime may override a declared profile sandbox. If a live canary disagrees with the file, trust the live result and force sequential or plan-only operation.
- Do not treat provider diversity as proof of unbiased review. Require independent evidence and an external oracle.
- Bind remote approvals and signals to a task, contract digest, input digest, authenticated actor when available, sequence, acknowledgement, and expiry when the runtime supports it. Otherwise keep consequential work local or plan-only.

## Blind spots

- Provider CLIs and config schemas can change independently.
- Profile instructions guide behavior but do not replace tool-enforced path or credential controls.
- Separate sessions reduce anchoring but do not guarantee different training bias or objective truth.
- A Wayfinder can still become a single integration bottleneck.
- Network partitions, daemon restarts, delayed messages, and client replay can stale a task or split perceived ownership.
- More sessions increase cost, latency, context drift, stale-input risk, and merge overhead.
- Remote convenience expands the daemon trust boundary.
- Paseo absence or an unsupported Paseo/Codex version leaves compatibility unverified. Do not simulate a successful provider smoke test.

Mitigate bottlenecks with one expiring integration lease, a fencing epoch/token, a checkpoint artifact, revocation of the old epoch, and an Owner-approved successor. Mitigate drift and replay with digest, sequence, freshness, acknowledgement, and expiry checks. These controls reduce risk but cannot make an external daemon or provider fully trusted.

Use Proofline's signal and Proof Return protocols even when Paseo is unavailable. The governance contract is the durable layer; the adapter is replaceable.
