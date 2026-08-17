# Verification contract

Freeze acceptance before implementation. The implementer cannot pass work using only a self-authored checklist.

## Evidence ledger

Record:

- target URL as provenance metadata only;
- every local input path, type, byte size, rights status, and digest;
- every local screenshot viewport and page state;
- every local asset slot, relative path, alt text, and digest;
- source identity, content, data, media, and metadata inventory with synthetic replacements;
- visible unaffiliated-research-demo notice for public research;
- neutralized and masked regions;
- implementation commit or tree digest;
- selected local run mode, container engine, command, ports, storage, and health result;
- verifier identity and command receipts.

## Deterministic gates

1. Brief validation exits successfully, produces byte-stable outputs, and leaves a `valid` receipt whose digests match the normalized brief and plan.
2. Every approved route loads directly at each required viewport.
3. Public research includes a visible unaffiliated-demo notice, and every inventoried source identity, copy, media, metadata, personal, product, and contact-data value is replaced or masked with zero source-token matches in static output.
4. Static output contains no unapproved source domain, remote asset, source script, tracker, iframe, service worker, password input, or external form action.
5. Local browser traffic contains no external requests. Local mutation requests are zero unless the approved application behavior requires and tests them.
6. Console errors, broken assets, and horizontal overflow are zero unless documented as accepted exceptions.
7. Keyboard and accessibility checks match the selected fidelity and scope.
8. Tests and the repository validation command pass on the final tree.
9. Every rendered image and media reference maps to one current relative local path and digest in the asset inventory.
10. Screenshot completeness is measured against the user-supplied local route, state, and viewport matrix. Missing local evidence is reported as an exception, not fetched from the source site.
11. When authorized assets use the owner-run downloader, the offline verifier checks every downloaded file independently for containment, symlinks, nonzero size, image signature, digest, and manifest coverage. The downloader's own receipt is not sufficient acceptance evidence.
12. The local run command and any container engine match `replica.local_development`.

For Docker Compose, inspect the Dockerfile and Compose files before execution. Record the selected engine, the quiet Compose configuration check, bound ports, build or pull approval, and the local health result. Do not print resolved configuration that may contain secrets. For host-native or preserved workflows, record the exact existing local run command instead.

## Visual comparison

Visual evidence is subjective unless the inputs and method are frozen. Record:

- source and output screenshots;
- exact viewport and device scale;
- screenshot tool and browser version;
- comparison method and tolerance;
- masks for neutralized identity, copy, and media;
- named human reviewer for final judgment.

Public research may claim layout parity only. Neutralized content prevents a whole-page identity or pixel-equivalence claim.

Follow the repository visual gate:

- 0-2: no screenshot loop;
- 3-4: one screenshot check and at most one focused correction;
- 5-6: propose a bounded loop and wait for explicit approval.

## Verdicts

- `PASS`: every required deterministic and visual gate passes.
- `PASS WITH EXCEPTIONS`: required behavior works and every exception is bounded, safe, and documented.
- `FAIL`: a required gate, safety control, local input, source receipt, or verifier is missing.

Missing evidence is not a pass. Use `not configured`, `not run`, or `unresolved` explicitly.
