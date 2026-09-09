<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Landing pages and SEO

The user explicitly requires the landing presentation from Git `60c8e06` to be preserved. SEO and article work must not redesign the home, doctor or cabinet landing pages, rewrite their visible copy, change their navigation or calls to action, or add/remove sections unless the user explicitly requests that change. Keep guide styles isolated from the landing styles. `node scripts/check-landing-restoration.mjs` checks the original markup and assets against a running site.

The user subsequently requested navigation to the articles: keep the “Guides pratiques” links to `/guides` in the desktop and mobile menus. This is an explicit exception to the original navigation, covered by the same check.
