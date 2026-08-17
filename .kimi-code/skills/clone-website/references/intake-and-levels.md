# Intake and levels

Use this reference only for unresolved choices. Infer repository facts, but never infer ownership, permission, licenses, or approval for sensitive features.

## Question order

1. Source and target route.
2. Authority and content rights.
3. Intended outcome and fidelity.
4. Route or catalog scope.
5. Backend level.
6. Source platform and stack only when the existing repository does not settle them.
7. Local development mode, and container engine only when Docker Compose is selected.

Ask one to three questions per batch. Offer two or three mutually exclusive choices. Put the context-aware recommendation first. Keep each option to one advantage and one disadvantage.

## Source choices

| Choice | Advantage | Disadvantage | Recommend when |
| --- | --- | --- | --- |
| Owner repository, local export, or design file | Most complete and stable | Requires authority and secure handling | The user owns or controls the site |
| Supplied screenshots and mock JSON | Deterministic and network-free | Hidden states may be missing | Public research or a visual prototype |
| Synthetic local fixtures | No source content reuse | Lower evidence fidelity | The user has only a written brief |

## Authority and content rights

Authorization values:

- `owned`: the user owns or controls the source and destination.
- `written-permission`: the user has explicit permission for the requested scope.
- `public-research-local`: only public evidence, neutralized output, local/private use.

Content-right values:

- `owned`
- `licensed`
- `permission`
- `neutralized`

If evidence is missing, recommend `public-research-local` plus `neutralized`. Never upgrade that default silently.

## Fidelity

| Level | Result | Advantage | Disadvantage |
| --- | --- | --- | --- |
| `F1 structure` | Sections, hierarchy, and routes | Fast and inexpensive | Limited visual or behavioral parity |
| `F2 visual` | F1 plus responsive visual layout | Good prototype fidelity | Needs screenshot evidence and review |
| `F3 interaction` | F2 plus approved UI states and flows | Tests real user behavior | More implementation and verification work |
| `F4 migration` | Authorized content, data, and platform migration | Best owner-controlled continuity | Highest rights, data, and operational risk |

Default to F2 only when the user asks to clone the visible experience. Otherwise recommend the lowest level that satisfies the outcome.

## Scope

| Level | Result | Default cap |
| --- | --- | --- |
| `S1 page` | One route and named states | 1 page, 12 items |
| `S2 templates` | Representative page templates | 10 pages, 20 items |
| `S3 catalog` | Templates plus a bounded catalog sample | 20 pages, 20 items |
| `S4 full authorized` | Complete approved scope | Explicit owner-defined cap |

Public research cannot use S4. Never convert a public page into an unbounded crawl.

## Backend levels

| Level | Architecture | Advantage | Disadvantage | Recommend when |
| --- | --- | --- | --- | --- |
| `B0 static` | Static pages, local JSON, or build-time content | Lowest cost and risk | No real multi-user state or production transactions | F1/F2 prototypes and public research |
| `B1 small` | Integrated app server with managed database, CMS, or storage | Simple production path for a small team | Provider coupling and moderate operations | Small authorized products, forms, or admin needs |
| `B2 scale-ready` | Separate API and durable data, cache, queue, and object storage | Clear scaling and integration boundaries | Highest cost and operational complexity | Proven traffic, integrations, or independent service needs |

Public research permits B0 or a local synthetic B1 only. B2, live identity, commerce, external forms, and owner data require `owned` or `written-permission`.

## Dynamic stack recommendation

Use these rules in order:

1. Preserve a working repository stack when it meets the brief.
2. Use plain HTML/CSS/JS for a one-page disposable F1/F2 exercise.
3. Recommend Astro with TypeScript for content-heavy B0 sites that benefit from components and static output.
4. Recommend Next.js with TypeScript and managed services for B1 applications that need server rendering, forms, or one integrated deployment.
5. For B2, choose frontend and API frameworks from team constraints, then name database, cache, queue, storage, observability, and deployment boundaries.
6. For an authorized Shopify source, consume a user-provided local export or mock Storefront API response.
7. For an authorized WordPress or WooCommerce source, consume a user-provided local export or mock REST response.

Never present a framework as universally best. State the evidence, tradeoff, and trigger for changing the recommendation.

## Required structured stack selection

When repository evidence does not settle the target stack, do not silently choose one. Use the active parent runtime's structured-question tool. Common labels include `AskUserQuestion`, `request_user_input`, Ask Question, and `question`. If no such tool is exposed, ask one concise plain-text question.

Use two stages so each question stays bounded:

1. Ask for the source platform: Shopify, WordPress/WooCommerce, or existing/generic.
2. Read `workflow-routing.md`, then ask only the two or three target-stack options compatible with that platform, backend level, and destination repository.

Put `Preserve existing stack` first whenever the destination repository already has a suitable framework. Do not offer a framework switch based only on popularity. Record the selected identifiers in `replica.source_platform` and `replica.target_stack` before validation.

## Required local development selection

Do not derive the local runtime from the target stack. Infer it only when the repository already has a safe, working run workflow or the user explicitly selected one. Otherwise read `local-development.md` and ask for `preserve-existing`, `host-native`, or `docker-compose`. Allow the user to name another runtime and record it as `custom` with a bounded description.

When `docker-compose` is selected, ask a second question only if the available engine is not already known. Offer Docker Desktop, Docker Engine with Compose, or a compatible provider. Record the result in `replica.local_development` before validation.

## Example compact questions

Source:

- Screenshots/local files (recommended): stable and safe, but hidden states are absent.
- Owner export or local API response: most complete, but requires authority and secure handling.
- Synthetic fixtures: no source reuse, but lower evidence fidelity.

Backend:

- B0 static (recommended for F2/S1): fastest and safest, but no real server state.
- B1 small: supports forms and managed data, but adds operations.
- B2 scale-ready: supports growth, but costs more and needs proven requirements.

Local development:

- Preserve existing (recommended when it works): lowest migration risk, but keeps current constraints.
- Host native: simplest for one service, but requires host toolchains.
- Docker Compose: consistent multi-service setup, but adds engine, image, storage, and port costs.
