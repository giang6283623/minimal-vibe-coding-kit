# Workflow routing and stack choice

Use this reference after rights, fidelity, scope, backend level, and destination repository facts are known. The routing baseline was checked against official platform documentation in August 2026. Recheck official documentation before creating a new live integration because platform APIs and framework guidance change.

## Tool rule

When the stack is unresolved, use the structured-question tool exposed by the active parent runtime. Common names are `AskUserQuestion` in Claude and Kimi, `request_user_input` in Codex, Ask Question in Cursor, and `question` in OpenCode. Never assume a tool exists from its name. If none is exposed, ask one concise plain-text question in the parent conversation.

Ask no more than three choices at once. Put the recommendation first. Each option must state one benefit and one cost. Child agents return `needs_user_input` to the parent and never question the end user directly.

## Stage 1: source platform

Infer this only from local repository or export evidence. Otherwise ask:

- Shopify: local Shopify export or Storefront API response.
- WordPress/WooCommerce: local WordPress or WooCommerce export or REST response.
- Existing/generic: another repository, static site, screenshots, design files, or generic JSON.

Record the more precise identifier when evidence supports it: `shopify`, `wordpress`, `woocommerce`, `existing-repository`, `static-site`, or `generic`.

## Stage 2: target stack

Always recommend `preserve-existing` first when a suitable destination repository exists.

| Source | Choice set when no suitable stack exists | Backend fit | Selection rule |
| --- | --- | --- | --- |
| Shopify | `shopify-hydrogen`, `nextjs-app-router`, `astro-typescript` | Hydrogen B1/B2, Next.js B1/B2, Astro B0 | Hydrogen for Shopify-native headless commerce, Next.js for an integrated React app, Astro for a read-only catalog |
| WordPress | `wordpress-block-theme`, `astro-typescript`, `nextjs-app-router` | WordPress B1/B2, Astro B0, Next.js B1/B2 | Native block theme for WordPress operations, Astro for static content, Next.js for an authorized headless app |
| WooCommerce | `woocommerce-native`, `nextjs-app-router`, `astro-typescript` | Native B1/B2, Next.js B1/B2, Astro B0 | Native for plugin and checkout continuity, Next.js for headless UI, Astro for a read-only catalog |
| Static or generic | `astro-typescript`, `nextjs-app-router`, `static-html-css-js` | Astro B0, Next.js B0/B1/B2, plain static B0 | Astro for content collections, Next.js for server features, plain files for a disposable one-page result |

Do not recommend a stack because it is fashionable. Match the brief and the team's ability to operate it. Preserve an existing Nuxt, SvelteKit, Remix/React Router, Laravel, Rails, Django, or other maintained stack when it can satisfy the brief.

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

Use this ID to select one platform playbook. If the combination is custom, preserve it but perform a short architecture review and record the data, image, routing, deployment, and verification boundaries before implementation.

## Execution stages

1. `intake`: record rights, source platform, target stack, and bounds.
2. `validate`: create and validate the v1 brief; use its derived workflow ID.
3. `normalize`: run the local-only export normalizer when a supported local JSON export exists.
4. `authorize-assets`: review candidate asset hosts with the owner.
5. `owner-download`: give the owner the bounded command. The agent does not run it.
6. `verify-assets`: after owner confirmation, run the offline verifier.
7. `implement`: follow the selected platform playbook against local fixtures and verified local assets.
8. `verify-replica`: run deterministic, accessibility, network, and visual gates from the verification contract.
