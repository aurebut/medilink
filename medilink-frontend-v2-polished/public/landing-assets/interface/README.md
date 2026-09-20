# Real interface captures

These lossless WebP files are screenshots of the application's actual React pages and CSS. The browser receives fictional API responses from `scripts/fixtures/landing-interface.mjs`. No account, patient data, stored document, or backend mutation is involved.

Start the frontend, then run from its directory:

```sh
node scripts/capture-landing-interface.mjs http://localhost:3000
```

The script uses an installed `playwright` module, or `PLAYWRIGHT_MODULE_PATH` when it is installed outside this project. The Codex workspace runtime is a fallback. `sharp` is resolved from Next.js dependencies; `SHARP_MODULE_PATH` can select a compatible installed runtime. On Windows, the default browser is installed Microsoft Edge; `CAPTURE_BROWSER_CHANNEL` overrides it.

`CAPTURE_OUTPUT_DIR` selects another destination for visual review. `CAPTURE_ONLY=messages,mission,documents` can limit a review run; `CAPTURE_DEVICE=desktop` or `mobile` limits it to one native layout. Partial runs require `CAPTURE_OUTPUT_DIR`, preventing them from replacing the complete public manifest. Use the full default run for the production manifest.

The captures use French locale, Europe/Paris time and a fixed 16 September 2026 clock. All API responses are intercepted; an unknown API request or external service makes the run fail. The application font requests are permitted. The only injected CSS hides the Next.js development indicator.

- Messages: `/app/messages?id=c1`, the native `.message-layout` component. Desktop includes the conversation list; mobile shows the selected conversation. General application navigation and the page title stay outside the crop. The viewport height is calculated from the real rendered messages to keep all three text bubbles and the complete composer visible.
- Mission: `/app/current-missions`, the real mission timeline with its establishment photo and candidate profile. The 1600 px desktop viewport keeps the native two-column timeline in a landscape capture for the computer mockup; mobile remains at 390 px. The viewport grows to keep fixed navigation outside the image. The mobile `previewHeight` is measured after the third complete step; enlargement shows all six.
- Documents: `/app/current-missions?section=documents`, the real shared replacement dossier, with the establishment photograph and replacement profile from the mission. Their account identities remain separate from the contract's names and dates. The fixture contains a prepared contract, an Ordre registration certificate, RCP insurance, bank details and an amendment; the letter to the Ordre remains to generate. It does not claim an electronic signature or an Ordre approval. The native `.replacement-dossier` component is captured with the selected register category/page, all its actions and document states. The mobile viewport remains at 390 px. Its height grows to keep fixed navigation outside the capture. The homepage preview and enlargement retain the complete selected page, including transmission and history.

`manifest.json` records the source routes, viewport sizes, crops, output dimensions, browser version and SHA-256 of each 2× image. Both 1× and 2× files are lossless WebP. Regenerate the whole set after interface changes; do not retouch the UI inside individual images.

The landing displays these captures in CSS device frames: a laptop above 700 px and an iPhone on narrower viewports. Desktop documents also use a 1600 px viewport, retaining their complete native card. Each desktop image fits proportionally inside the computer screen; the iPhone keeps native image proportions in a vertically scrollable screen. The status area and home indicator sit outside the captured content. Clicking opens the complete capture in the accessible lightbox.

Portraits and the establishment photo are fictional generated assets documented in `../people/README.md`. They are injected only through screenshot fixtures, never as default photos for real accounts. Image decoding finishes before capture. When only messages or mission photos change, run a partial capture into a review directory and replace those files and their matching manifest entries together, preserving the documents preview.
