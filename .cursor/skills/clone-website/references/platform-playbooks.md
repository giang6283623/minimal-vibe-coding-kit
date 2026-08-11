# Platform playbooks

Prefer official owner exports and APIs. Do not scrape a platform when the user can provide a repository, export, design file, or documented API.

## Existing repository

Preserve its framework, package manager, routing, localization, content accessors, and component system. Add a new framework only when the current stack cannot meet the approved fidelity or backend level.

## Static and content sites

- Use plain HTML/CSS/JS for a disposable single-page exercise.
- Use Astro when reusable components, content collections, or static route generation add value.
- Keep B0 output dependency-light and deployable as static files.

Official reference: https://docs.astro.build/en/concepts/why-astro/

## Next.js

Use the App Router for a B1 application when server rendering, route handlers, forms, or one integrated deployment are justified. Keep client components limited to interactive boundaries.

Official reference: https://nextjs.org/docs/app

## Shopify

For an owner-authorized headless migration, choose Hydrogen when Shopify's opinionated stack fits. Choose the Storefront API when the existing framework should remain.

Official references:

- https://shopify.dev/docs/storefronts/headless/getting-started/build-options
- https://shopify.dev/docs/api/storefront/latest

Do not reproduce checkout or customer identity from public research. Use Shopify-owned checkout and customer flows only with owner authorization.

## WordPress and WooCommerce

Prefer the existing platform, an owner export, or official APIs. Separate public catalog reads from authenticated administration and mutations.

Official references:

- https://developer.wordpress.org/rest-api/
- https://developer.woocommerce.com/docs/apis/rest-api/
- https://developer.woocommerce.com/docs/category/store-api

## Other platforms

Identify the platform from public evidence without installing detectors or running source scripts. If no official migration path is verified, use a normalized local content model and synthetic fixtures until the owner supplies an export or API contract.
