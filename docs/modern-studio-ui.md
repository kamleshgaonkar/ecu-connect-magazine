# Modern white studio UI

Implemented only in `D:\Creashna\GitHub\ecu-connect-magazine`, on `feature/modern-studio-ui`.

## Verified starting point

The completed Live Split-Screen Editor was committed at **70579d3d37743c699e11c8feb3fe23a0f58b57dd** on `feature/live-split-editor`. This branch was created directly from that exact commit. The only pre-existing tracked modification was `next-env.d.ts`; its existing backup remains at `.cache/phase3c-transfer-455e186/next-env.d.ts.original`.

## Application interface

The application uses white `#FFFFFF`, near-black `#111111`, light gray `#F5F5F5` and subtle `#E5E5E5` borders. Primary actions are black/white; secondary actions and navigation remain white/gray with monochrome icons. UI text uses a system sans-serif stack. The decorative sidebar quote, development labels, old green controls and decorative faux magazine covers were removed. Dashboard magazine tiles are clearly application placeholders, not invented magazine designs.

The existing split workspace remains: 60/40 default, draggable and keyboard-adjustable divider, independent editor/iframe scrolling, stable Save controls, 300 ms live-preview debounce, page navigation, zoom and fit-to-width. Narrow screens keep Edit/Preview tabs. Desktop, tablet and mobile layouts were inspected visually.

Navigation now uses **Magazines** and **Page Templates**, with the correct selected state. Page Templates opens a real `/templates` page rather than an anchor to generic feature cards. Unsaved edits require confirmation before leaving through the sidebar.

Labels use everyday wording: Magazine Details, Magazine Design, Section Details, Page Layout, Background Style, Save Magazine, Cover photo, Image description and image position. Internal template IDs remain stored unchanged, but are not normal-user labels. Font/image notes and export warnings are translated only at the UI boundary; renderer checks and export rejection rules remain intact.

## Actual reference gallery

All 17 family thumbnails were rasterized as complete pages directly from the supplied original PDFs. There is no invented artwork, font extraction, recropping of the magazine page, or replacement magazine design. Prebuilt WebP thumbnails total about 836 KiB including their source manifest; runtime does not require Python/PDF rasterization. Images load lazily in the application.

Only the four implemented families offer **Use This Layout**. The remaining 13 have **Coming soon / Not available to use yet**, with no working action. The gallery states that thumbnails are original published reference pages, not claims of exact generated-template fidelity.

| Internal inventory ID | User-facing name | Original volume / physical PDF page | Availability |
| --- | --- | --- | --- |
| T01 | Cover | V20 p1 | Available; opens existing cover settings |
| T02 | Contents | V20 p2 | Available; opens story summary/thumbnail settings |
| T03 | Photo opener | V20 p3 | Available; applies to selected story |
| T04 | Article continuation | V20 p4 | Available narrative variant; applies to selected story |
| T05 | Paper panel | V15 p9 | Not available |
| T06 | People & announcements | V20 p6 | Not available |
| T07 | Photo gallery | V20 p13 | Not available |
| T08 | Operations opener | V20 p11 | Not available |
| T09 | Operations article | V20 p12 | Not available |
| T10 | Notice Board | V20 p16 | Not available |
| T11 | Notice continuation | V19 p13 | Not available |
| T12 | Leadership feature | V17 p5 | Not available |
| T13 | The ECU Worldwide Way | V20 p17 | Not available |
| T14 | The Way · continuation | V20 p18 | Not available |
| T15 | Holidays | V20 p19 | Not available |
| T16 | Holidays · continuation | V17 p23 | Not available |
| T17 | Contributions & social | V20 p20 | Not available |

The mappings follow the existing template inventory. [Machine-readable sources](../public/template-thumbnails/sources.json) record exact source filenames, pages and thumbnail dimensions. The first four and all reference-only families were visually inspected in the final gallery screenshot.

### Use This Layout

The user selects an existing magazine and, for story layouts, an included story. Applying Photo opener or Article continuation changes only that story's layout selection and clears conflicting opening/continuation overrides back to the chosen layout defaults. Text, images, captions, story order and other settings are preserved. The editor marks the change unsaved; **Save Magazine** is required to persist it. The one-time URL request is consumed so refreshing does not reapply an old choice.

Cover and Contents are already included by the existing renderer. Their action opens the appropriate existing settings without adding duplicate pages or marking the magazine dirty. Empty magazines are handled explicitly; there is no fake action on unfinished families. Reference artwork is never installed into the uploaded-image library or magazine content.

## Magazine/PDF preservation

No changes were made in `src/magazine`, `src/domain`, `src/media`, or `src/app/api/export`. Package manifests/lock files, supplied PDFs and original design documents are unchanged. All approved magazine typography, colors, backgrounds, layouts, cover/contents/page furniture and template rendering remain in the isolated document.

The preview-only message bridge changes the surrounding viewer surface to light gray after pagination. It does not recolor or resize authored magazine content, change image bytes, or participate in export. A browser test verifies that application controls are monochrome while the magazine masthead remains the original blue.

The print comparison uses a Git-archived renderer from the exact split-editor baseline 70579d3 and identical sample input:
- Magazine HTML: byte-identical.
- PDF bytes: identical after normalizing creation/modification timestamps.
- Both PDFs: 90,323 bytes.
- HTML SHA-256: `cd21f0f2cbd2c1ad5755800dbe9c206b298180554ddf0c0b9302aa1c391d2bf2`.

[Recorded PDF comparison](modern-studio-pdf-invariance.json). The comparison uses the same installed Windows Chromium; different browser/font versions can produce different bytes. It is not a new approval of original template fidelity.

## Verification

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| ESLint | Passed without warnings |
| Production build | Passed, including /templates |
| Unit suite | 34 passed across 6 files |
| Browser/PDF suite | 37 passed: all existing 31 plus 6 studio usability cases |
| Reference gallery | 17 mapped originals; exactly 4 available actions |
| Identical-input PDF | Unchanged against 70579d3, excluding timestamps |
| Existing local edit | Original next-env.d.ts and backup SHA-256 match |

New tests cover gallery navigation/selected state, search/availability filters, original thumbnail sources, unavailable actions, chosen-story application, explicit Save/reload, content preservation, Cover/Contents settings, unsaved navigation protection, monochrome controls, retained preview colors, and desktop/tablet/mobile usability. Existing tests retain split resizing, cursor/selection, live updates, image upload/reload, missing/corrupt-image rejection, size warnings, long pagination/folios and real PDF export. Existing UI assertions were renamed to match the simpler interface; no existing test cases were removed.

Screenshots were captured from the completed production build:
- [Dashboard, desktop](previews/modern-studio/dashboard-desktop.png)
- [Page Templates, full desktop gallery](previews/modern-studio/templates-desktop.png)
- [Live editor, desktop](previews/modern-studio/editor-desktop.png)
- [Live editor, tablet](previews/modern-studio/editor-tablet.png)
- [Page Templates, mobile](previews/modern-studio/templates-mobile.png)
- [Live preview, mobile](previews/modern-studio/editor-mobile.png)

## Changed files

- `src/app/globals.css`, `src/app/studio.css`, `src/app/layout.tsx`: monochrome UI tokens and responsive studio styling/import.
- `src/app/templates/page.tsx`: actual Page Templates route.
- `src/components/shell.tsx`, `dashboard.tsx`: clear navigation, selected states, simpler creation/library dashboard.
- `src/components/template-gallery.tsx`: reference gallery, filters and magazine/story selection dialog.
- `src/components/issue-editor.tsx`: safe one-time layout requests, unchanged content editing, clearer labels and unsaved navigation protection.
- `src/components/design-controls.tsx`, `visual-controls.tsx`, `media-picker.tsx`, `split-workspace.tsx`, `preview.tsx`: friendly UI labels and warning presentation.
- `src/components/preview-document.ts`: light-gray viewer surroundings only.
- `src/studio/layout-catalog.ts`, `src/studio/apply-layout.ts`: UI-only catalog/names, warning translation and content-preserving layout action.
- `public/template-thumbnails/*.webp`, `sources.json`: original-page gallery thumbnails and provenance.
- `scripts/generate-template-thumbnails.py`: reproducible whole-page rasterization.
- `scripts/verify-live-editor-pdf.ts`: configurable baseline folder/commit for print comparison.
- `tests/studio-ui.test.ts`, `tests/studio-ui.spec.ts`: four unit and six browser cases.
- Existing `tests/editorial.spec.ts`, `foundations.spec.ts`, `live-editor.spec.ts`, `visual-templates.spec.ts`, `workflow.spec.ts`: updated UI wording assertions.
- `README.md`, this report, PDF evidence JSON and six screenshots: use/validation documentation.

The existing `next-env.d.ts` edit is excluded from the feature commit. Validation restored its exact original bytes after each build; its backup was never changed.

## Local use

From this repository:

```powershell
npm run dev -- --port 3121
```

Open the app and choose **Page Templates** in navigation, or visit `http://localhost:3121/templates`. Keep the existing host/port when accessing previous browser-local drafts/images, because storage is origin-specific.

Tests used `ECU_TEST_PORT=3121`, `CI=1` and `CHROMIUM_EXECUTABLE_PATH` pointing to the already installed Chromium. The full suite runs after `npm run build` using `npm run test:e2e`; other checks are `npm run typecheck`, `npm run lint`, `npm test`.

To regenerate thumbnails, install PyMuPDF/Pillow into the ignored `.tools/python` folder and run `scripts/generate-template-thumbnails.py`. This only rasterizes original PDF pages; it does not extract fonts.

To reproduce the baseline comparison, archive `src/domain` and `src/magazine` from 70579d3 into an ignored baseline folder. Set `PDF_BASELINE_DIR` to that folder and `PDF_BASELINE_COMMIT=70579d3d37743c699e11c8feb3fe23a0f58b57dd`, then run `npx vite-node scripts/verify-live-editor-pdf.ts` with Chromium configured.

## Limits and stop point

- The gallery is a reference library, not implementation of additional magazine families. T05–T17 remain unavailable.
- T04 retains its existing partial scope; mixed table/side-photo/fade regions remain unavailable and are stated in its selection dialog.
- Legacy/basic layout choices remain available under plain names to preserve existing drafts; they are not advertised as completed reference families.
- Original font/image fidelity limitations, the 1 MB PDF request cap and browser-origin storage limits remain.
- Divider/zoom/page settings remain session-only and live pagination still measures the full issue after the debounce.
- Fonts use the installed system sans-serif stack; no new remote UI font is required.

No work was performed in the old project directory. No remote push, merge, force-push, deployment, Supabase modification or Phase 3C Batch 2 work was performed.
