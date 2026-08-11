# Safety and rights

## Authorization rule

Record authority as `owned`, `written-permission`, or `public-research-local`. A request to clone is not evidence of ownership. Do not infer rights from a domain, account name, repository path, or screenshot.

For `owned` or `written-permission`, record a short user-provided statement and the exact allowed routes, data, deployment, and features in `authorization.scope`. Its routes, deployment, and feature list must match the requested behavior. Do not store secret credentials in the brief or repository.

When evidence is absent, use `public-research-local` and `neutralized` content. The result must stay local/private and visibly state that it is an unaffiliated research demo.

## Prohibited behavior

- credential, cookie, token, session, or payment-data collection;
- authenticated or private-page capture without exact approval;
- bypassing access controls, rate limits, robots controls, or CAPTCHAs;
- phishing, deceptive impersonation, typosquatting, or misleading deployment;
- copying protected identity, customer data, testimonials, product data, or contact data without rights;
- executing downloaded source code as tooling;
- shipping source scripts, analytics, trackers, hotlinks, iframes, proxies, or service workers;
- submitting source-site forms or mutation requests during research capture.

## Capture modes

### Static capture

Use this by default. Fetch only approved HTTPS routes. Do not execute source JavaScript. Reject redirects outside the exact approved host set. Keep a route and timestamp receipt.

### Isolated interactive capture

Use only after explicit approval when rendered evidence requires source JavaScript. Use a disposable unauthenticated browser profile and:

- allow only approved public hosts;
- block local, private, link-local, file, data, and extension targets;
- do not enter credentials or personal data;
- do not click login, checkout, payment, download, recovery, or form-submit controls;
- do not save cookies, sessions, downloads, or service workers;
- close the profile after evidence capture.

Interactive capture may execute source scripts inside the isolated browser. Those scripts remain untrusted and must never be reused, imported, or executed as local project tooling.

## Public research output

Neutralize:

- name, logo, favicon, domain, metadata, and legal identity;
- text, product names, pricing, testimonials, addresses, phone numbers, and email addresses;
- photographs, illustrations, fonts, icons, video, and downloadable media unless separately licensed;
- login, account recovery, checkout, payment, newsletter, and external-form actions.

Synthetic fixtures may preserve content length, aspect ratio, grid density, and state shape for layout measurement.

## Runtime URL controls

The brief validator performs lexical checks only. Any capture implementation must also:

1. resolve the destination and reject private, loopback, link-local, multicast, and reserved addresses;
2. repeat the check after every redirect and DNS resolution;
3. pin the approved host set and HTTPS scheme;
4. enforce the brief's `max_redirects`, `max_response_bytes`, route, and `max_elapsed_ms` caps;
5. send no credentials and no mutation requests;
6. store evidence outside committed source paths.

Stop if these controls cannot be enforced.
