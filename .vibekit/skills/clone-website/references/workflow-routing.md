# Workflow routing and stack choice

Use this reference after rights, fidelity, scope, backend level, and destination repository facts are known. The routing baseline was checked against official platform documentation in August 2026. Recheck official documentation before creating a new live integration because platform APIs and framework guidance change.

## Intake tool rule

When the stack is unresolved, use the structured-question tool exposed by the active parent runtime. Common names are `AskUserQuestion` in Claude and Kimi, `request_user_input` in Codex, Ask Question in Cursor, and `question` in OpenCode. Never assume a tool exists from its name. If none is exposed, ask concise plain-text questions in the parent conversation.

Ask no more than three choices at once. Put the recommendation first. Each option must state one benefit and one cost. Complete all unresolved routing choices during the front-loaded intake. Child agents return `needs_user_input` to the parent and never question the end user directly.

## Stage 1: source platform

Infer this only from local repository or export evidence. Otherwise ask:

- Shopify: local Shopify export or Storefront API response.
- WordPress/WooCommerce: local WordPress or WooCommerce export or REST response.
- Managed commerce: BigCommerce or Adobe Commerce owner export or API response.
- Site builder: Wix, Squarespace, or Webflow owner export, repository, or API response.
- Headless CMS: owner export, schema, or API response.
- Existing/generic: another repository, static site, screenshots, design files, or generic JSON.

Record the most precise validator-backed identifier supported by evidence. Use `custom` only with `custom-review` routing.

## Stage 2: target stack

Always recommend `preserve-existing` first when a suitable destination repository exists.

| Source | Choice set when no suitable stack exists | Backend fit | Selection rule |
| --- | --- | --- | --- |
| Shopify | `shopify-hydrogen`, `nextjs-app-router`, `astro-typescript` | Hydrogen B1/B2, Next.js B1/B2, Astro B0 | Hydrogen for Shopify-native headless commerce, Next.js for an integrated React app, Astro for a read-only catalog |
| WordPress | `wordpress-block-theme`, `astro-typescript`, `nextjs-app-router` | WordPress B1/B2, Astro B0, Next.js B1/B2 | Native block theme for WordPress operations, Astro for static content, Next.js for an authorized headless app |
| WooCommerce | `woocommerce-native`, `nextjs-app-router`, `astro-typescript` | Native B1/B2, Next.js B1/B2, Astro B0 | Native for plugin and checkout continuity, Next.js for headless UI, Astro for a read-only catalog |
| BigCommerce | `preserve-existing`, `nextjs-app-router`, `astro-typescript` | Existing or Next.js B1/B2, Astro B0 | Preserve an operational storefront, use Next.js for headless commerce, or Astro for a read-only catalog |
| Adobe Commerce | `preserve-existing`, `nextjs-app-router` | Existing or Next.js B1/B2 | Preserve the current commerce stack unless an authorized GraphQL-backed headless target is justified |
| Wix | `preserve-existing`, `wix-headless`, `astro-typescript` | Existing or Wix B1/B2, Astro B0 | Preserve Wix operations, use Wix Headless for an approved decoupled app, or Astro for exported static content |
| Squarespace or Webflow | `preserve-existing`, `nextjs-app-router`, `astro-typescript` | Existing or Next.js B1, Astro B0 | Preserve the managed site when editors depend on it; otherwise migrate owner exports into a bounded frontend |
| Headless CMS | `preserve-existing`, `nextjs-app-router`, `astro-typescript` | Existing, Next.js B1/B2, Astro B0/B1 | Preserve the current integration, choose Next.js for dynamic server features, or Astro for content-first output |
| Static or generic | `astro-typescript`, `nextjs-app-router`, `static-html-css-js` | Astro B0, Next.js B0/B1/B2, plain static B0 | Astro for content collections, Next.js for server features, plain files for a disposable one-page result |

Do not recommend a stack because it is fashionable. Match the brief and the team's ability to operate it. Standard routing also validates the stack's backend level: static HTML and Astro are B0, native and headless commerce stacks are B1 or B2, Next.js supports B0 through B2, and `preserve-existing` keeps the reviewed repository level. Preserve an existing Nuxt, SvelteKit, Remix/React Router, Laravel, Rails, Django, or other maintained stack when it can satisfy the brief.

## Generated workflow ID

The brief validator derives:

```text
<source-platform>-to-<target-stack>
```

Examples:

- `shopify-to-shopify-hydrogen`
- `wordpress-to-astro-typescript`
- `woocommerce-to-nextjs-app-router`
- `existing-repository-to-preserve-existing`

Use this ID to select one platform playbook. If the stack or backend combination is custom, preserve it only with `routing_mode: custom-review` and a validator-backed `replica.architecture_review` that records the data, image, routing, deployment, and verification boundaries before implementation.

## Execution stages

1. `intake`: record all rights, project, scale, source, stack, data, image, runtime, quality, and authority choices.
2. `validate`: create and validate the v2 brief, source digests, and workflow ID.
3. `launch`: approve the exact action, path, host, cost, and stop-condition set once.
4. `acquire`: import local evidence or use exact-host capture only when frozen policy permits it.
5. `normalize`: produce local content and asset manifests with no application runtime dependency on source URLs.
6. `implement`: follow the selected platform playbook against verified local inputs.
7. `verify`: run deterministic, accessibility, network, asset, responsive, and proportional visual gates.
8. `harden`: retry bounded local failures without widening scope.
9. `handoff`: deliver the runnable site, receipts, exceptions, update path, and rollback notes.

An autonomous run does not ask between these stages. Unknown authority, host, credential, cost, destructive action, production action, dependency install, or changed input sets `needs-owner-input` and produces one consolidated question.
