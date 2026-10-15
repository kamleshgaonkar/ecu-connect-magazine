# ECU Connect Magazine Builder

## Modern white studio

The application now has a white/monochrome workspace, **Magazines** and **Page Templates** navigation, and a real [Page Templates gallery](/templates). The gallery uses 17 original reference-page thumbnails; only the four implemented families have Use This Layout actions. Story choices preserve content and require Save Magazine to persist. The live split editor, uploads, drafts and PDF rendering are retained.

See [screenshots, changed files, tests and limitations](docs/modern-studio-ui.md). Run `npm run dev -- --port 3121` for an isolated review. Use your original host/port to access existing browser-local drafts and images.



## Live split-screen editing

Desktop editing now shows a resizable 60/40 editor/preview workspace. Drag the divider, use its Left/Right keys, or double-click to restore 60/40. Preview updates automatically after a short typing pause; use page navigation, zoom and Fit to width without changing the PDF. Narrow screens use Edit/Preview tabs.

Existing Save and local drafts remain explicit. Export waits for the latest measured revision, and image/overflow/size warnings remain enforced. See the [implementation, validation and limitations report](docs/live-split-editor.md) and [desktop screenshot](docs/previews/live-editor/editing.png). For an isolated local review use `npm run dev -- --port 3119`; keep your usual origin/port when accessing existing browser-local drafts/images.



## Phase 3C batch 1

Select **T04 · Editorial continuation** for reference-based one/two-column narrative, ordered figure blocks with captions/credits and yellow callouts. Use story appearance controls for column count/title visibility and block controls for explicit page/column breaks. Fixed-block overflow warns and blocks PDF export; text is never automatically reduced. V17's full-width table below columns and T05–T17 are deferred.

See the [reference-mapped plan](docs/phase3c-plan.md), [visual comparison and validation report](docs/phase3c-implementation.md), and [sample PDF](public/previews/ecu-phase3c-editorial.pdf). For an occupied local port, use `npm run dev -- --port 3107`; browser tests accept `ECU_TEST_PORT=3107` and `CHROMIUM_EXECUTABLE_PATH`. Existing Windows/Linux installation instructions below remain applicable.

An initial local editorial workspace built with Next.js App Router, TypeScript and Tailwind CSS. Volume 21 is clearly labeled fictional demonstration content, not ECU Worldwide announcements or approved copy.

## Run locally

Node.js 22+ and npm are required. From the repository root:

```sh
npm ci
 # Skip this download if /usr/bin/chromium is already installed.
PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" npx playwright install chromium
npm run dev
```

On Windows (PowerShell), install Chromium into the same repository cache with:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.cache\ms-playwright"; npx playwright install chromium
```

Chromium also needs Linux system libraries. If missing, use Playwright's supported `install-deps chromium` command with system package installation permissions. The PDF endpoint and browser tests use `/usr/bin/chromium` when available, or `CHROMIUM_EXECUTABLE_PATH` when supplied. Otherwise the Next configuration and Playwright test configuration use the repository's `.cache/ms-playwright` by default; set `PLAYWRIGHT_BROWSERS_PATH` to override. npm's cloud cache is configured at `/workspace/.cache/npm`; outside the cloud use `npm ci --cache /your/writable/cache`.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

E2E tests start the production server if one is not already running. They exercise issue creation, editing, save/reload, pagination, conditional sections, responsive widths, PDF download, and export warnings. `npm run start` starts a previously built production app.

## Working slice

Create an issue on the dashboard, add any of the seven section types, rename them, select feature/dispatch/bulletin templates, reorder or exclude sections, then add and reorder stories. Stories can be excluded individually and can inherit or override section templates/themes; opening and continuation page masters can be selected separately. Issue-level furniture switches control section headers, the issue/date footer, printed folios and the yellow top accent. Story blocks support paragraphs, headings, pull quotes and bullet lists, with inline **bold** and _italic_ marks (select text and use the block toolbar). Save explicitly; unsaved edits have a status indicator and navigation warning. Preview/export uses current edits even before saving.

The `IssueRepository` contract isolates storage from the UI. Its current adapter stores validated JSON in browser localStorage, seeds Volume 21 only on first use, and reports storage errors instead of overwriting corrupt data. No Supabase account is needed. A Supabase adapter can implement the same async list/get/save/remove methods. Browser data is specific to the current origin/profile and is not shared between users or devices. Clearing browser storage removes it.

## Pagination and PDF

`src/magazine/document.ts` produces one self-contained A4 document for both the sandboxed preview iframe and server Chromium. Shared page components include the cover, running header/footer, contents rows and typed content blocks. The browser measures rendered heights, flows blocks onto new pages and splits oversized text at word boundaries (Unicode-safe fallback). No text is silently shrunk or clipped. Every story starts on a fresh page. Contents pagination is reserved before stories and page references are populated from actual page positions, including multi-page stories. All contents pages appear together immediately after the cover, without printed folios. The first article is printed folio 1 after the final contents page: physical page 3 with one contents page, or later with multiple contents pages. Article continuations advance folios and TOC references use actual story starts without clipping or shrinking contents text.

`POST /api/export` accepts a validated issue snapshot, renders the same document with Playwright, checks layout warnings and returns an A4 PDF attachment. Invalid input returns 400; oversized payloads return 413; unresolved layout/cover overflow returns 422. External renderer requests are blocked. Chromium processes are closed after export. PDF requires a Node server with Chromium binaries and libraries; it is not an Edge or static-host export.

Current limits: basic rich-text blocks, no full gallery/table templates, single-column story continuations, 300-page/1 MB export caps, no widow/orphan or hyphenation rules. Long blocks may split across pages. Browser fonts can differ from server Chromium, so the PDF remeasures its own pages; its contents numbers remain accurate for that export. This is an RGB editorial proof, not press-ready CMYK, bleed, crop marks or PDF/X. Templates and copy are editable starting points, not approved corporate artwork or announcements.

The export endpoint is intended for this local milestone. Before public multiuser hosting, add authentication, authorization, export concurrency/rate limits and durable storage. No deployment, collaboration, AI rewriting, approvals or freeform canvas is included.

## Architecture

- `src/domain`: validated issue/section/story/block types and labeled sample data.
- `src/repositories`: replaceable persistence interface and local adapter.
- `src/components`: dashboard, issue editor, structured story editor, shell and preview.
- `src/magazine`: shared templates, page components and measured pagination.
- `src/app/api/export`: isolated Chromium PDF path.

## Phase 3A foundations

The approved Volume 20 baseline now has shared A4/15 mm geometry, blue `#034EA2` and yellow `#FFDD00` tokens, typed DOM page masters and a shared measured renderer. The three existing layouts remain selectable; `editorial` and `paper` add plain-article and inset-paper foundations. These are not complete reproductions of the 17 reference template families. The dashboard/shell styling is unchanged; editor additions are small appearance controls.

Issue records have `schemaVersion: 2`. `migrateIssue()` accepts the original unversioned/v1 schema and preserves all prior text, IDs, section/template ordering, dates and sample status. Reads do not rewrite browser storage; explicit save writes validated v2 records under the existing localStorage key. Future versions and unknown fields are rejected instead of silently discarded. Do not clear localStorage to upgrade.

Themes resolve from issue → section → story. Story template and page-master choices independently inherit from their parent; a continuation can use a different master. Physical PDF index, printed folio and furniture visibility are separate. Footer folios use `1`, `2`, etc.; contents references use `01`, `02`, etc. Font families prefer Poppins/Impact where installed; no original font files are bundled or extracted. The preview explicitly reports system fallback typography.

`MediaAssetRepository` separates local binary assets from issue JSON. Its Phase 3A adapter is in-memory/session-only and tests metadata limits and copy isolation. Story media references have alt text, caption, credit and focal point. Upload UI, durable asset storage and image placement are deferred; a nonempty media reference currently raises a clear layout warning and blocks PDF export rather than silently omitting it. No external storage or Supabase is introduced.

See [the Phase 3A report](docs/phase3a-implementation.md) for every changed file, validation, screenshots, branch status and limits. The archived Phase 1 sample PDF is retained at its original path. The separate foundation proof is `/previews/ecu-phase3a-foundation.pdf`.


## Phase 3B visual templates and local images

Cover (T01) and yellow two-column Contents (T02) use the shared magazine renderer. Expand **T01 · Cover design & local images** in Edition details to edit the headline, supporting text and edition ribbon, select a white/sky/blue surface, and upload an approved photograph or logo. No approved logo or photos are seeded into the application; labelled placeholders make their absence explicit.

Select **T03 · Photographic section opener** in the section/story template or opening-page master. Expand **T02 / T03 · Contents & story images** to edit a contents summary, optional landscape/portrait/square thumbnail, opener photo, full/large hero and below/left/right narrative placement. Templates retain section/story theme inheritance. Only the first included story in an included nonempty section displays its large marker; markers follow current included-section order, independently of printed folios. Opener narrative continues through existing article/paper masters without repeating its large marker.

Upload PNG, JPEG or WebP files (up to 8 MB each); select/replace existing images, set alternative text, caption/credit, fill/contain and horizontal/vertical focal position. Bytes are stored in IndexedDB (`ecu-connect:media:v1`), while localStorage retains issue references and crop settings. Save the issue explicitly. Images remain usable after reload on the same browser/origin; clearing browser storage or moving to another computer does not transfer those local uploads. A future storage adapter can replace the media repository interface.

Preview resolves referenced local bytes into a validated, self-contained render payload. The unchanged `/api/export` endpoint uses that exact document and bundled fonts, waits for decoded images, and rejects missing/corrupt images, metadata mismatches or unresolved overflow. Resolution below 150 dpi at the placed size is an advisory warning. The existing **1 MB total PDF request limit** includes base64-encoded image bytes (roughly 33% larger than files), so compact images may be necessary even when uploads succeed. Oversized requests are blocked in the preview; the application never silently resizes or omits an image to make it fit.

Poppins Regular/Bold and Bebas Neue are bundled as Latin/Latin-extended WOFF subsets under SIL OFL. Impact and Bebas Neue Bold are not supplied; the masthead and large numerals use documented Bebas Neue approximations. Other scripts use system fallbacks. No fonts are extracted from the reference PDFs. Attribution, visual comparison, current limits and the complete changed-file list are in [the Phase 3B report](docs/phase3b-implementation.md).

The [Phase 3B comparison proof](public/previews/ecu-phase3b-visual-templates.pdf) uses fictional Volume 21 copy and historical Volume 20 artwork solely for comparison. It is not approved publication content and is not seeded into the app. Regenerate it from the repository root with `python3 scripts/reference-proof-assets.py` (PyMuPDF/Pillow required), then `npx vite-node scripts/generate-phase3b-proof.ts` (Chromium required). The reference helper rasterizes logo artwork for this proof only; it does not extract fonts. See [screenshots and comparison notes](docs/phase3b-implementation.md).
