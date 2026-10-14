# Phase 3B — Cover, Contents and Section Opener

Implemented on `phase3b/visual-templates`, based on verified commit `f9dedd2f914cabb2ba46d3113f9f9212450a8291`. Cursor's `src/app/api/export/route.ts` is byte-for-byte unchanged, including Chromium selection and error diagnostics. The original design documents, reference PDFs, archived proofs, shipped Volume 21 copy and dashboard styling are preserved. README additions retain the Windows Chromium installation instructions.

## Delivered templates

- **T01 Cover:** blue condensed ECU CONNECT masthead, upper-right white logo plaque, yellow/blue angled edition/date ribbon, centred editable headline, yellow rule, optional supporting text, lower photograph with fade, white/sky/blue surfaces and explicit sample label. Upload/select photographs and the official logo; choose fill/crop or contain and horizontal/vertical focal positions. Missing assets have labelled fallbacks rather than invented branding.
- **T02 Contents:** yellow A4 page, white Poppins prefix and oversized Bebas Neue display heading, divider, two measured columns, grouped blue section-start folios/headings, story bullets, editable italic summaries and optional landscape/portrait/square thumbnails. Small blue story-start references are also shown. Contents continuations repeat the full display size, identify themselves in the smaller prefix, repeat a section heading when a group crosses columns/pages, and stay immediately after the cover. Both group and story references come from actual measured article starts.
- **T03 Section Opener:** large or full-page photograph, translucent section ordinal, white section title and yellow tab, fade into the story's inherited/overridden theme, opening title/byline/narrative, and below/left/right text placement. Plain article or inset-paper continuations preserve the narrative and omit the large marker. Only the first included story of a visible nonempty section shows its ordinal. Markers are consecutive in current included-section order; printed folios remain independent.

The editor retains its existing structure and adds appearance disclosures and accessible labelled controls. Existing add/remove/reorder, sample flags, explicit saves, warnings and preview/export workflows remain in place.

## Local media and compatibility

The existing `MediaAssetRepository` contract now has a durable IndexedDB adapter, alongside the original memory adapter for isolated tests. Uploaded PNG/JPEG/WebP bytes are stored in `ecu-connect:media:v1`; localStorage continues using `ecu-connect:issues:v1` for issue data. A shared local library allows reuse of an image across cover/story placements. Uploads refresh other selectors immediately; late upload completions use the current editing callback. No image bytes are placed into saved issue JSON. Replacing/deselecting an image does not delete stored bytes or other references.

Schema v2 receives optional, validated cover and story-visual configurations and an ephemeral `renderAssets` transport field. Legacy v1/v2 issues continue to load without rewriting stored data or changing their copy. Saving explicitly strips render transport. The render payload deduplicates referenced assets and embeds only PNG/JPEG/WebP data URLs. Arbitrary external URLs are rejected. Preview and the unchanged server route pass this payload through the same `magazineDocument` pipeline.

Images are decoded before rendering is reported ready. Missing references, corrupt data, actual/declared dimension mismatches and unresolved text/layout overflow block export. Images below 150 dpi at their placed frame size receive an advisory notice; missing unselected artwork instead uses a clearly identified fallback. Text is measured at authored size and continued without clipping or automatic shrinking. Fixed cover copy and oversized contents entries remain visible and block export.

Uploads accept up to 8 MB per file, but the preserved PDF route caps the **entire JSON request at 1 MB**, including base64 image expansion. Large images can therefore be stored/previewed while export remains blocked with an explicit explanation. Images are never resized automatically. Compact JPEG/WebP files are recommended until a separately approved export transport change. IndexedDB/localStorage are browser- and origin-specific: reloads retain images, but GitHub checkout, another computer, a different origin, private-mode disposal or clearing browser data do not transfer them. Storage failures are reported; automatic cleanup or portable issue/media backups are outside this phase.

## Visual inspection and comparison

All four supplied PDFs were opened and pages 1–3 were rasterized and **visually inspected individually** before implementation. Additional section-opener variations were visually reviewed at V15 p8, V17 p6, V19 p6 and V20 p8; V20 p8 combines opener decoration with the later organizational-announcement panel composition. Volume 20 pages 1, 2 and 3 are the primary comparison pages. Volumes 15, 17 and 19 pages 1–3 establish cover surface/supporting-copy variants, contents grouping/thumbnail formats, photographic themes and photo-to-narrative transitions. No font extraction was performed.

The generated screenshots were visually compared with those pages during implementation. This led to corrections to masthead vertical placement, portrait thumbnail framing, contents continuation typography/column sizing, and photograph/furniture stacking. The exported PDF was also rasterized and its first three pages visually inspected against the browser proof. This is a reconstruction with documented differences, **not an exact visual match**.

| Template | Implemented reference composition | Remaining visible differences |
| --- | --- | --- |
| T01 — V20 PDF p1; V15/17/19 p1 variations | Upper-right rounded plaque, blue masthead, angled yellow/blue ribbon, centred blue title/rule, lower full-width photograph | Bebas Neue is narrower/lighter than Impact; visible masthead ends before the reference's right edge. A 118 pt fallback preset approximates the reference's visible cap height, rather than its 104 pt Impact metrics. Ribbon uses 9 pt Poppins and is narrower for the shorter fictional date. Fictional headline/standfirst changes line count. Fade/crop and shadow are CSS approximations. Sample/credit labels are deliberate additions. |
| T02 — V20 PDF p2; V15/17/19 p2 variations | Full yellow, 150 pt white display, two columns separated by 12 mm, 45 pt blue section folios, bullets, italic summaries, portrait/landscape thumbnails | Bebas regular lacks the original bold numeral weight and exact display width. Seven optional sample sections replace the five original groups, so group positions and folios differ. Layout fills columns in reading order instead of manually positioning each historical group. Thumbnail height is a 100 mm portrait preset, versus roughly 110 mm in V20; user crop is configurable. Small per-story folios and proof credits are additions. Category pills/custom campaign panels are deferred. |
| T03 — V20 PDF p3; V15/17/19 p3 variations | Full-width upper hero, 172.17 pt translucent marker, white section label/yellow tab, lower themed narrative, blue heading/yellow rule and original 9/12 pt body rhythm | Reference-derived photograph has a slightly different crop/fade; Bebas regular substitutes for bold ordinal type. Poppins Regular/Bold are bundled, while intermediate/italic weights may be synthesized. The fictional long subtitle and structured heading/quote consume more vertical space and produce an extra continuation. V20's bespoke yellow statistic card and V19's address/side-photo compositions are later templates/components. Left/right/full-photo panels are constrained extensions, not claims that every variation duplicates an original page. |

Current geometry remains 210 × 297 mm with a 15 mm text frame; contents starts 16 mm from the top, opener narrative at 135 mm, and cover photo at 126 mm. Initial blue/yellow tokens remain `#034EA2` and `#FFDD00`. Cover and all contents pages are unnumbered. Article folio 1 starts after the final contents page (physical p3 with one contents page). Subsequent folios include all measured continuation pages.

## Fonts and assets

Poppins Regular/Bold and Bebas Neue Regular were obtained from the Google Fonts repository's `ofl/poppins` and `ofl/bebasneue` directories under SIL OFL, not extracted from the PDFs. Latin/Latin-extended and common punctuation subsets are bundled as WOFF data in `src/magazine/fonts.ts`, with retained attribution and licences in `docs/licenses/`. CSS aliases are `ECU Poppins` and `ECU Bebas`. Other scripts fall through to installed fonts. The exact source versions used in the originals cannot be verified. Impact and Bebas Neue Bold have no supplied licensed files; the current deterministic fallback remains visibly different. Licensed Impact assets and any additional required Poppins weights/scripts need an approved source before exact typography can be assessed.

Source TTF SHA-256 fingerprints:

```text
Poppins Regular  7e65201e9b79159e2300267cc885e16c8dcef2424cdfa09a29bfb0980a94a7ba
Poppins Bold     983676516167748b74de6f4771fb384c664fd913acb8b471122ecacf5da5ea6c
Bebas Neue       08e4623805102d819f58601e46e345648846075e363b2ceb23313c2d1c83ec73
```

The app does **not** seed stock imagery, an invented logo, or purportedly approved historical artwork. It needs approved original-resolution photographs and an official standalone ECU Worldwide logo, uploaded locally. The comparison proof alone uses the supplied V20 cover/opener/portrait raster images plus a rasterized logo crop, with explicit reference-only credits. Their presence in a historical PDF does not establish approval to republish them. These reference assets are not installed into the user's image library or sample issue defaults. Their source resolution triggers advisory warnings, particularly when placed across an A4 page.

## Review artifacts and regeneration

- [Sample A4 comparison PDF](../public/previews/ecu-phase3b-visual-templates.pdf): fictional Volume 21 text, 10 pages, reference-only artwork, body folio 1 on physical p3. Served from `/previews/ecu-phase3b-visual-templates.pdf` when running the app.
- [Cover screenshot](previews/phase3b-cover.png).
- [Contents screenshot](previews/phase3b-contents.png).
- [Section Opener screenshot](previews/phase3b-opener.png).

The proof retains the shipped fictional copy and changes only its in-memory template/media selections. The portrait/photo source is historical reference artwork, not a new ECU announcement. Existing Phase 1/3A PDFs and screenshots are not overwritten. Regeneration requires PyMuPDF/Pillow for `python3 scripts/reference-proof-assets.py`, then Chromium and the existing dev dependencies for `npx vite-node scripts/generate-phase3b-proof.ts`. Temporary extracted artwork is written to the OS temporary directory. The TypeScript script uses the same document, image readiness, overflow checks and A4 Chromium PDF settings as the existing endpoint; browser tests additionally export through that endpoint.

## Validation

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, no warnings |
| `npm test` | All 28 tests passed across 4 files |
| `CI=1 npm run test:e2e` | All 17 browser tests passed against a production server |
| `npm run build` | Production build passed |
| Proof generation | 10 pages, no layout warnings; expected reference-image resolution notices |
| PDF inspection | A4 approximately 594.96 × 841.92 pt; cover + contents precede body folio 1; first three PDF pages rasterized and visually inspected |
| Preservation | Export route, original design documents/PDF references, shipped sample copy and archived proofs unchanged from base |

New unit tests cover configuration round trips, selected template/continuation resolution, visible-section numbering, deduplicated image transport, invalid URLs/MIME/metadata and exclusion of transport from persisted issues. New browser tests cover upload/select/reuse, saved crop/focal settings and images after reload, actual PDF download, full-photo/right-panel narrative continuations, reordered/disabled sections, missing/corrupt/dimension-mismatched images, low-resolution notices, visible overflow rejection, mobile controls/unsupported uploads and the preserved PDF size limit. Existing tests remain active; the unresolved-media assertion now expects a missing-image error, and the multi-page contents fixture uses summaries to overflow the new denser columns.

No deployment, merge to main, Supabase connection or force-push is performed.

## Remaining scope

T04–T17 visual designs, original multi-column editorial continuation, galleries/tables/statistic cards/campaign assets, widow/orphan rules, press-ready CMYK/PDF-X, upload cleanup/backups and external storage remain outside this milestone. The current continuations reuse Phase 3A article/paper masters. Photo cropping intentionally crops pixels; text overflow remains visible and blocks PDF export. Section markers follow the configurable visible-section order, rather than permanently pinning the reference's `01–04` categories when extra/optional sections are present.

## Every changed file

35 files changed/added relative to `f9dedd2`.

| File | Status | Purpose |
| --- | --- | --- |
| `README.md` | Modified | User workflow, local image persistence, unchanged request cap and proof regeneration; Windows instructions retained |
| `docs/licenses/BebasNeue-OFL.txt` | Added | Font copyright attribution and SIL OFL redistribution licence |
| `docs/licenses/Poppins-OFL.txt` | Added | Font copyright attribution and SIL OFL redistribution licence |
| `docs/phase3b-implementation.md` | Added | Implementation, comparison, licensing, validation, limitations and complete file inventory |
| `docs/previews/phase3b-contents.png` | Added | Screenshot of implemented contents template for visual review |
| `docs/previews/phase3b-cover.png` | Added | Screenshot of implemented cover template for visual review |
| `docs/previews/phase3b-opener.png` | Added | Screenshot of implemented opener template for visual review |
| `public/previews/ecu-phase3b-visual-templates.pdf` | Added | Separate A4 comparison proof; original proofs retained |
| `scripts/generate-phase3b-proof.ts` | Added | Reproducible shared-renderer proof PDF and three screenshots |
| `scripts/reference-proof-assets.py` | Added | Extracts/rasterizes historical artwork for comparison only, never fonts or app defaults |
| `src/components/design-controls.tsx` | Modified | T03 template/master choices and continuation choices |
| `src/components/issue-editor.tsx` | Modified | Integrates cover/story visual disclosures without changing existing workflows |
| `src/components/media-picker.tsx` | Added | Upload/select/replace, shared-library refresh, alt/caption/credit, crop/focal controls and local preview |
| `src/components/preview.tsx` | Modified | Resolves local assets for shared preview/export and reports request size/storage failures |
| `src/components/visual-controls.tsx` | Added | T01 cover and T02/T03 story configuration controls |
| `src/domain/design.ts` | Modified | Adds the opener template/master identifier |
| `src/domain/issue.ts` | Modified | Optional cover/story-visual and validated ephemeral render-asset fields |
| `src/domain/media.ts` | Modified | Image fit and self-contained render transport validation |
| `src/magazine/document.ts` | Modified | Serializes image helper and bundled font styles into the shared document |
| `src/magazine/fonts.ts` | Added | SIL OFL font subsets embedded for identical offline preview/PDF typography |
| `src/magazine/media-image.ts` | Added | Shared safe DOM image/placeholder and crop-position helper |
| `src/magazine/page-masters.ts` | Modified | Reusable original-inspired cover and photographic opener compositions with furniture/credits |
| `src/magazine/pagination.ts` | Modified | Measured grouped two-column contents, active opener continuations, image readiness/warnings and actual references |
| `src/magazine/styles.ts` | Modified | Reference-based T01/T02/T03 A4 typography, colours, regions and photo treatments |
| `src/magazine/templates.ts` | Modified | T03 registry, plain default continuations, section identity/start/ordinal resolution |
| `src/magazine/tokens.ts` | Modified | Bundled-font aliases and deterministic display fallbacks |
| `src/media/local.ts` | Added | Durable IndexedDB binary asset adapter |
| `src/media/render.ts` | Added | Deduplicates/resolves referenced local bytes without mutating saved issue data |
| `src/media/repository.ts` | Modified | Documents durable adapter while retaining original interface/memory adapter |
| `src/repositories/issues.ts` | Modified | Strips transient image transport from saves |
| `tests/fixtures/crop-calibration.png` | Added | Deterministic colour calibration fixture; never used as magazine art |
| `tests/foundations.spec.ts` | Modified | Retains unresolved-media rejection check with its new missing-image error |
| `tests/visual-templates.spec.ts` | Added | Six browser scenarios covering visual templates, uploads/reload/crops/continuations/errors/limits |
| `tests/visual-templates.test.ts` | Added | Five model/migration/transport/persistence unit tests |
| `tests/workflow.spec.ts` | Modified | Adds summaries to exercise genuinely multi-page contents under the new column template |
