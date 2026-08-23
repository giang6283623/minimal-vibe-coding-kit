# Platform playbooks

Prefer local owner exports, repositories, design files, and mock API responses. For authorized work, capture from approved hosts when local artifacts are missing. Ask the user for local artifacts or written permission when evidence is missing.

Select exactly one playbook from the validated `replica.workflow_id`. Run the common local data pipeline in `authorized-data-and-assets.md` before framework-specific implementation. Official links below are technical references only.

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

Use the latest stable Storefront API version supported by the owner project. Do not bind a production migration to a preview API version without a separate review.

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

## BigCommerce and Adobe Commerce

Use owner exports first. Keep catalog, checkout, customer identity, pricing, inventory, and order mutation as separate authority boundaries.

- `bigcommerce-to-preserve-existing`: keep the current storefront, checkout, integrations, and operational deployment.
- `bigcommerce-to-nextjs-app-router`: normalize an owner export first, then add an approved headless commerce boundary only when B1 or B2 behavior requires it.
- `bigcommerce-to-astro-typescript`: catalog-only B0 output with local data and local assets.
- `adobe-commerce-to-preserve-existing`: preserve the owner-operated Adobe Commerce storefront unless the brief justifies a migration.
- `adobe-commerce-to-nextjs-app-router`: use local GraphQL fixtures before any owner-approved live GraphQL integration. Keep checkout, customer, and order mutations disabled until separately authorized.

Official references:

- BigCommerce headless storefronts: <https://docs.bigcommerce.com/developer/docs/storefront/headless/overview>
- Adobe Commerce GraphQL: <https://developer.adobe.com/commerce/webapi/graphql/>

## Wix, Squarespace, and Webflow

Prefer the owner-managed site when editors, forms, memberships, bookings, or commerce operations depend on platform features. Export or normalize content before rebuilding the visual layer.

- `wix-to-preserve-existing`: keep Wix hosting and operations.
- `wix-to-wix-headless`: use Wix Headless only for an authorized decoupled application with explicit API and identity boundaries.
- `wix-to-astro-typescript`: static owner-export migration. Do not simulate bookings, membership, checkout, or live business data.
- `squarespace-to-preserve-existing` and `webflow-to-preserve-existing`: keep the managed platform when its editing or commerce workflow is required.
- `squarespace-to-nextjs-app-router`, `webflow-to-nextjs-app-router`, or either platform to Astro: start with a local owner export. Add live APIs only when the brief and launch policy authorize the exact hosts and capabilities.

Official references:

- Wix Headless: <https://dev.wix.com/docs/go-headless>
- Squarespace Products API: <https://developers.squarespace.com/commerce-apis/products>
- Webflow Data API: <https://developers.webflow.com/data/reference/rest-introduction>

## Headless CMS and custom platforms

For `headless-cms`, preserve the existing SDK and schema when a maintained destination repository exists. Otherwise normalize owner-provided entries, relations, locales, media metadata, redirects, and SEO fields into local fixtures before selecting Astro or Next.js.

For `custom`, use `custom-review`. Record the source contract, authentication boundary, pagination, rate limit, webhooks, images, mutations, deployment, rollback, and verifier before implementation. A requirements answer never authorizes credentials, network access, installs, production writes, or paid actions.

## Other platforms

Identify the platform only from user-provided local evidence. Do not install detectors or run source scripts. If no migration path is available locally, use a normalized local content model and synthetic fixtures until the owner supplies an export or API contract.

Preserve Nuxt, SvelteKit, Remix/React Router, Laravel, Rails, Django, or another maintained stack when it already exists and meets the brief. For greenfield work, use only the bounded choices in `workflow-routing.md`. A custom choice gets `custom-review` treatment and must name its data, image, routing, deployment, and verification boundaries before implementation. Drupal, Magento variants, PrestaShop, Shopware, custom CMS, marketplaces, and private commerce engines follow this route until a validator-backed standard playbook exists.

Framework references:

- Astro content collections: <https://docs.astro.build/en/guides/content-collections/>
- Next.js App Router: <https://nextjs.org/docs/app>
