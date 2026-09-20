# Real interface captures

These lossless WebP files are screenshots of the application's actual React pages and CSS. The browser receives fictional API responses from `scripts/fixtures/landing-interface.mjs`. No account, patient data, stored document, or backend mutation is involved.

Start the frontend, then run from its directory:

```sh
node scripts/capture-landing-interface.mjs http://localhost:3000
```

The script uses an installed `playwright` module, or `PLAYWRIGHT_MODULE_PATH` when it is installed outside this project. The Codex workspace runtime is a fallback. `sharp` is resolved from Next.js dependencies; `SHARP_MODULE_PATH` can select a compatible installed runtime. On Windows, the default browser is installed Microsoft Edge; `CAPTURE_BROWSER_CHANNEL` overrides it.

`CAPTURE_OUTPUT_DIR` selects another destination for visual review. `CAPTURE_ONLY=messages,mission,documents` can limit a review run; `CAPTURE_DEVICE=desktop` or `mobile` limits it to one native layout. Partial runs require `CAPTURE_OUTPUT_DIR`, preventing them from replacing the complete public manifest. Use the full default run for the production manifest.

The captures use French locale, Europe/Paris time and a fixed 16 September 2026 clock. All API responses are intercepted; an unknown API request or external service makes the run fail. The application font requests are permitted. The only injected CSS hides the Next.js development indicator.

- Messages: `/app/messages?id=c1`, the native `.message-layout` component. Desktop includes the conversation list; mobile shows the selected conversation. General application navigation and the page title stay outside the crop. The viewport height is calculated from the real rendered messages to keep all three text bubbles and the complete composer visible. Mobile also reserves the phone's full content height, keeping the composer aligned with the bottom of the screen without stretching the capture.
- Mission: `/app/current-missions`, the real mission timeline. The 1600 px desktop viewport keeps the native two-column timeline, establishment photo and candidate profile in a landscape capture. The mobile viewport remains at 390 px and captures only `.candidate-current-route-list`, with an 8 px margin around its six complete rows. The large header and profiles remain in the actual app, outside this mobile crop. `previewHeight` equals the full image height; every step, status, description and date fits inside the phone at once, without scrolling or enlargement. The viewport grows to keep fixed navigation outside the image.
- Documents: `/app/current-missions?section=documents`, the real shared replacement dossier, with the establishment photograph and replacement profile from the mission. Their account identities remain separate from the contract's names and dates. The fixture contains a prepared contract, an Ordre registration certificate, RCP insurance, bank details and an amendment; the letter to the Ordre remains to generate. It does not claim an electronic signature or an Ordre approval. The native `.replacement-dossier` component is captured with the selected register category/page, all its actions and document states. The mobile viewport remains at 390 px. Its height grows to keep fixed navigation outside the capture. The homepage capture retains the complete selected page, including transmission and history; its lower rows are accessible by scrolling within the phone.

`manifest.json` records the source routes, viewport sizes, crops, output dimensions, browser version and SHA-256 of each 2× image. Both 1× and 2× files are lossless WebP. Regenerate the whole set after interface changes; do not retouch the UI inside individual images.

The landing displays these captures in CSS device frames: a laptop above 700 px and an iPhone on narrower viewports. Desktop documents also use a 1600 px viewport, retaining their complete native card. Each desktop screen uses its capture's aspect ratio, so the image meets all screen edges without blank bands. The iPhone keeps native image proportions; its status and home-indicator areas scale with the phone width. The six-step mission capture fits completely in its screen. The longer documents capture remains accessible through scrolling, including with the keyboard. Previews have no image links, click handlers or lightbox.

Portraits and the establishment photo are fictional generated assets documented in `../people/README.md`. They are injected only through screenshot fixtures, never as default photos for real accounts. Image decoding finishes before capture. When only messages or mission photos change, run a partial capture into a review directory and replace those files and their matching manifest entries together, preserving the documents preview.
