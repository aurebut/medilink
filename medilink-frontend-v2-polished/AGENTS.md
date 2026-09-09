<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Landing pages and SEO

All three process steps now play at 1.5x speed, as explicitly requested. Keep that rate in the shared navigation clock, including the manual interaction delay, so every movement, transformation, reading hold and tab progression stays synchronized. Individual scene timings remain authored at 1x; do not speed them up again. Pause and reduced-motion controls remain available.

The user subsequently requested redesigning step 03 as “Concluez”: validate the payment, animate money from the establishment to the locum, then transform those same banknotes into a concise report of the whole mission. This supersedes the earlier instruction to leave step 03 intact. Keep the current steps 01 and 02 unchanged. `process-conclude-scene.ts` controls the two-state sequence, pause, visibility and reduced-motion navigation; `process-conclude-geometry.ts` shares the payment route between the markup and motion. The report uses explicitly illustrative figures, with no real payment action. Keep the left-hand copy short (payment and overall report).

The user approved renaming homepage step 01 to “Matchez”, then shortened its left-hand copy to “Nous vous rapprochons selon vos critères.”, one sentence each for “Remplaçant” and “Établissement”, and “Échangez pour préciser vos conditions et préparer le contrat.” Keep this copy concise, without promising automatic legal compliance.

The user subsequently requested replacing step 02 with “Piloter”: a continuous three-state illustration of documents exchanged between the titulaire, remplaçant and Ordre des médecins; practical information (parking, access codes, software access, coffee, contacts, hours); and an illustrative daily recap. The actual large documents must shrink and travel themselves, with no duplicate miniature courier. Five documents appear in turn. The drawn connections and moving documents share `content/process-pilot-geometry.ts`; keep their paths aligned, with a progressive reduction before departure and labels outside the connections. Practical information flows continuously as bare icons without cards from the holder/establishment to the locum, then gathers into the recap. `process-pilot-scene.ts` controls this second scene using the shared navigation clock, its own duration, visibility, pause and reduced-motion controls. Step 01's illustration and step 03 stay intact. The restoration check allows the requested copy and label changes for steps 01/02.

The user explicitly requires the landing presentation from Git `60c8e06` to be preserved. SEO and article work must not redesign the home, doctor or cabinet landing pages, rewrite their visible copy, change their navigation or calls to action, or add/remove sections unless the user explicitly requests that change. Keep guide styles isolated from the landing styles. `node scripts/check-landing-restoration.mjs` checks the original markup and assets against a running site.

The user subsequently requested navigation to the articles: keep the “Guides pratiques” links to `/guides` in the desktop and mobile menus. This is an explicit exception to the original navigation, covered by the same check.

The user also requested replacing the three homepage process previews with connected, abstract vector diagrams. Keep the illustrations in `content/landing-process-art.ts` and their scoped styles in `app/(public-home)/process-art.css`, imported by the homepage so Next.js versions the stylesheet with its content. Do not move them back into an unversioned public stylesheet: stale CSS caused black, unstyled diagrams after deployment. Preserve the process section's surrounding structure, copy, tabs, and mobile behavior. The restoration check explicitly allows these three figures and their compiled stylesheet while still checking the original page everywhere else. Verify deployed CSS and computed SVG styles after publishing changes to these illustrations.

The user then requested a continuous map-to-criteria-to-discussion transformation entirely inside tab 01, reusing the existing designs and leaving tabs 02 and 03 intact. The checklist becomes a conversation about rétrocession, payment timing and reviewing the contract together. `LandingProcess` now bundles the navigation and first-scene animation with the page; do not also load the legacy `/landing-process.js`, which remains unchanged as a reference asset. The first scene waits until its artwork is visible and supports pause and reduced motion (manually cycling through all three states); later tabs retain their original timing, keyboard and touch behavior.
