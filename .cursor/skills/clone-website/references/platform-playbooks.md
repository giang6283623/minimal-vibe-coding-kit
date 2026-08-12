# Platform playbooks

Prefer local owner exports, repositories, design files, and mock API responses. Never scrape or fetch a platform. Ask the user for local artifacts when evidence is missing.

## Existing repository

Preserve its framework, package manager, routing, localization, content accessors, and component system. Add a new framework only when the current stack cannot meet the approved fidelity or backend level.

## Static and content sites

- Use plain HTML/CSS/JS for a disposable single-page exercise.
- Use Astro when reusable components, content collections, or static route generation add value.
- Keep B0 output dependency-light and deployable as static files.

## Next.js

Use the App Router for a B1 application when server rendering, route handlers, forms, or one integrated deployment are justified. Keep client components limited to interactive boundaries.

## Shopify

For an owner-authorized headless migration, choose Hydrogen when Shopify's opinionated stack fits. Otherwise preserve the existing framework and consume a user-provided local Storefront API fixture or owner export.

Do not reproduce checkout or customer identity from public research. Use Shopify-owned checkout and customer flows only with owner authorization.

## WordPress and WooCommerce

Prefer the existing platform, a local owner export, or user-provided mock API responses. Separate public catalog fixtures from administration and mutation fixtures.

## Other platforms

Identify the platform only from user-provided local evidence. Do not install detectors or run source scripts. If no migration path is available locally, use a normalized local content model and synthetic fixtures until the owner supplies an export or API contract.
