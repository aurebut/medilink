<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Landing pages and SEO

The user approved renaming homepage step 01 to “Matchez”, then shortened its left-hand copy to “Vos critères vous rapprochent.”, one sentence each for “Remplaçant” and “Établissement”, and “Échangez pour préciser vos conditions et préparer le contrat.” Keep this copy concise, without promising automatic legal compliance. Keep steps 02/03 and the illustrations unchanged when editing this copy.

The user explicitly requires the landing presentation from Git `60c8e06` to be preserved. SEO and article work must not redesign the home, doctor or cabinet landing pages, rewrite their visible copy, change their navigation or calls to action, or add/remove sections unless the user explicitly requests that change. Keep guide styles isolated from the landing styles. `node scripts/check-landing-restoration.mjs` checks the original markup and assets against a running site.

The user subsequently requested navigation to the articles: keep the “Guides pratiques” links to `/guides` in the desktop and mobile menus. This is an explicit exception to the original navigation, covered by the same check.

The user also requested replacing the three homepage process previews with connected, abstract vector diagrams. Keep the illustrations in `content/landing-process-art.ts` and their scoped styles in `app/(public-home)/process-art.css`, imported by the homepage so Next.js versions the stylesheet with its content. Do not move them back into an unversioned public stylesheet: stale CSS caused black, unstyled diagrams after deployment. Preserve the process section's surrounding structure, copy, tabs, and mobile behavior. The restoration check explicitly allows these three figures and their compiled stylesheet while still checking the original page everywhere else. Verify deployed CSS and computed SVG styles after publishing changes to these illustrations.

The user then requested a continuous map-to-criteria-to-discussion transformation entirely inside tab 01, reusing the existing designs and leaving tabs 02 and 03 intact. The checklist becomes a conversation about rétrocession, payment timing and reviewing the contract together. `LandingProcess` now bundles the navigation and first-scene animation with the page; do not also load the legacy `/landing-process.js`, which remains unchanged as a reference asset. The first scene waits until its artwork is visible and supports pause and reduced motion (manually cycling through all three states); later tabs retain their original timing, keyboard and touch behavior.
