# Platform playbooks

Prefer local owner exports, repositories, design files, and mock API responses. Never scrape or fetch a platform. Ask the user for local artifacts when evidence is missing.

Select exactly one playbook from the validated `replica.workflow_id`. Run the common local data pipeline in `authorized-data-and-assets.md` before framework-specific implementation. Official links below are technical references, not permission to access the source website.

## Existing repository

Preserve its framework, package manager, routing, localization, content accessors, and component system. Add a new framework only when the current stack cannot meet the approved fidelity or backend level.

## Static and content sites

- Use plain HTML/CSS/JS for a disposable single-page exercise.
- Use Astro when reusable components, content collections, or static route generation add value.
- Keep B0 output dependency-light and deployable as static files.
- For `generic-to-astro-typescript`, map normalized items into a local Astro content collection and generate routes at build time.
- For `generic-to-static-html-css-js`, keep data in local JSON and avoid adding a build system.

## Next.js

Use the App Router for a B1 application when server rendering, route handlers, forms, or one integrated deployment are justified. Keep client components limited to interactive boundaries.

For `*-to-nextjs-app-router`, keep imported content server-side or build-time by default. Put verified images under `public/assets/imported/`. Enable route handlers, identity, cart, or mutations only when the brief authorizes them.

## Shopify

For an owner-authorized headless migration, choose Hydrogen when Shopify's opinionated stack fits. Otherwise preserve the existing framework and consume a user-provided local Storefront API fixture or owner export.

Do not reproduce checkout or customer identity from public research. Use Shopify-owned checkout and customer flows only with owner authorization.

- `shopify-to-shopify-hydrogen`: use Hydrogen for an authorized headless commerce target. Normalize a local Storefront API response first. Add live Storefront API access only as a later owner-approved integration.
- `shopify-to-nextjs-app-router`: use Next.js when the team needs one integrated React application and accepts maintaining the Shopify integration boundary.
- `shopify-to-astro-typescript`: catalog-only B0 output. Keep cart, checkout, customer identity, and live inventory disabled.
- `shopify-to-preserve-existing`: adapt the normalized content model to the repository's current framework.

Official references:

- Shopify Storefront API: <https://shopify.dev/docs/api/storefront/latest>
- Shopify Hydrogen: <https://shopify.dev/docs/storefronts/headless/hydrogen>

## WordPress and WooCommerce

Prefer the existing platform, a local owner export, or user-provided mock API responses. Separate public catalog fixtures from administration and mutation fixtures.

- `wordpress-to-wordpress-block-theme`: preserve WordPress content and use a block theme when the target remains WordPress.
- `wordpress-to-astro-typescript`: use a local WordPress REST export as build-time content for B0 publishing.
- `wordpress-to-nextjs-app-router`: use a local REST export first, then add an owner-approved live CMS boundary only for B1 or B2.
- `woocommerce-to-woocommerce-native`: preserve WooCommerce when native catalog, checkout, plugins, and administration are required.
- `woocommerce-to-nextjs-app-router`: use local Store API or REST export fixtures first. Keep checkout delegated to the owner-controlled WooCommerce service unless the brief explicitly authorizes another flow.
- `woocommerce-to-astro-typescript`: catalog-only B0 output. Do not enable cart, checkout, identity, or live inventory.

Official references:

- WordPress REST API: <https://developer.wordpress.org/rest-api/>
- WordPress media endpoint: <https://developer.wordpress.org/rest-api/reference/media/>
- WooCommerce APIs: <https://developer.woocommerce.com/docs/apis/>
- WooCommerce Store API products: <https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/products/>

## Other platforms

Identify the platform only from user-provided local evidence. Do not install detectors or run source scripts. If no migration path is available locally, use a normalized local content model and synthetic fixtures until the owner supplies an export or API contract.

Preserve Nuxt, SvelteKit, Remix/React Router, Laravel, Rails, Django, or another maintained stack when it already exists and meets the brief. For greenfield work, use only the bounded choices in `workflow-routing.md`. A custom choice gets `custom-review` treatment and must name its data, image, routing, deployment, and verification boundaries before implementation.

Framework references:

- Astro content collections: <https://docs.astro.build/en/guides/content-collections/>
- Next.js App Router: <https://nextjs.org/docs/app>
