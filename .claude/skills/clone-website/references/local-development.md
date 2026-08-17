# Local development runtime selection

Use this reference after the target stack is known and before freezing the brief. Keep local development separate from deployment. A project may run through Docker Compose locally and still deploy through a different approved target.

## Decision order

1. Preserve an existing safe, working project workflow.
2. Prefer host-native development for a simple one-service B0 result when the required toolchain already exists.
3. Recommend Docker Compose when the project needs repeatable multi-service setup, dependency isolation, or the user asks for containers.
4. Accept another user-selected runtime as `custom` after a short review of commands, files, ports, storage, network access, and cleanup behavior.

Do not infer Docker from the target framework. Do not replace a working native workflow merely because Docker is available.

## Brief values

Record one object under `replica.local_development`:

```json
{
  "mode": "preserve-existing",
  "container_engine": "none"
}
```

Modes:

- `preserve-existing`: use the repository's verified local workflow.
- `host-native`: use the package manager or framework directly on the host.
- `docker-compose`: use the checked-in Compose workflow.
- `custom`: use a user-named alternative after review.

Container engines:

- `none`: required for every mode except `docker-compose`.
- `docker-desktop`: use Docker Desktop as the local engine and Compose provider.
- `docker-engine`: use Docker Engine plus the Compose plugin, usually on an existing Linux setup.
- `compose-compatible`: use an existing compatible provider already approved by the user or repository.
- `custom`: use another user-named engine after review.

When either value is `custom`, add `custom_runtime` with a concise plain-language description. Do not store install commands, credentials, tokens, or shell fragments in this field.

## Question routing

If repository evidence and the request do not settle the runtime, ask one bounded question:

- Preserve existing (recommended when it works): least change, but keeps current constraints.
- Host native: simple for one service, but requires host dependencies.
- Docker Compose: repeatable for multiple services, but adds engine, image, disk, and port costs.

If Docker Compose is selected and the engine remains unknown, ask:

- Docker Desktop (recommended for a managed GUI setup): includes the engine, CLI, and Compose, but adds a desktop application and resource use.
- Docker Engine with Compose: lean for an existing Linux engine, but requires host administration.
- Compatible provider: preserves an approved alternative, but needs a compatibility check.

Allow the user to name another option. Record it as `custom` instead of silently mapping it to a standard value.

## Safe capability checks

Use read-only checks first:

```bash
command -v docker
docker version
docker compose version
```

Do not install an engine, start Docker Desktop, change a Docker context, pull images, build images, or start containers without explicit user approval. Before any approved Compose execution, inspect Dockerfiles, Compose files, build contexts, image tags, commands, entrypoints, environment files, secrets, bind mounts, named volumes, ports, networks, devices, `privileged`, and Docker socket access.

Bind development ports to `127.0.0.1` unless the user approves broader access. Do not mount credentials or the Docker socket by default. Do not use privileged containers by default. Never run pruning, volume deletion, or `docker compose down --volumes` as routine cleanup.

Use `docker compose config --quiet` for a non-executing configuration check when Compose is available. Do not print resolved configuration because interpolation may expose secrets. Treat image pulls, builds, and container startup as execution of untrusted project inputs.

## Handoff

Return one primary run path for the selected mode. Include prerequisites, the exact start command, the exact stop command, ports, persistent volumes, expected health check, and how to switch the runtime choice later. Keep an alternative workflow documented only when the user asked to preserve one.
