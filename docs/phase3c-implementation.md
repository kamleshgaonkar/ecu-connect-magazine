# Phase 3C batch 1: T04 editorial narrative

Branch `phase3c/editorial-templates` starts exactly at `b6d715489a95126e66fb0ac3c1590e21e872b019`. See [the reference-mapped plan](phase3c-plan.md). This is the first bounded batch, not all remaining templates. Stop here for review.

## Delivered

Inventory **T04 Editorial continuation** is selectable as `t04`, with an `editorial` page master. Legacy `editorial` remains the Phase 3A foundation; saved layouts are not silently reinterpreted. T04 provides full-width or explicit two-column narrative, optional opening headline/standfirst/byline, 9/12 pt text, small subheads, lists, quotes, ordered local figures/captions/credits and yellow callouts. Full-width evidence: V20 PDF p4–5, V19 p4, V15 p6–7. Two-column narrative: **V17 PDF p12**.

The two-column variant covers the narrative region of V17 p12. The full-width table below it is **not implemented**. This is not a complete reconstruction of that page or every T04 composition. Portrait/quote composites, side-photo regions and lower image fades also remain later work. T05–T17 are not registered as implemented.

The editor exposes column count, opening-title visibility, ordered figure upload/reuse, alt/caption/credit/crop settings, authored figure height and block column/page breaks. Existing add/remove/reorder and rich-text controls remain. Optional additive schema-v2 fields preserve legacy copy, IDs, order and the existing persistence key. Figures use the existing IndexedDB repository and deduplicated render transport.

## Pagination and preservation

Explicit DOM columns are measured in left-to-right reading order; CSS auto-columns are not used. Text continues through columns/pages with the selected count and theme. Small masthead/tab repeat; main title does not. A subhead probes space for following text. This is a basic association safeguard, not a complete widow/orphan engine. Figures/captions, callouts, quotes and opening heading groups stay atomic. Oversized fixed blocks remain visible, raise actionable warnings and block export. No type shrinking, automatic column changes or silent content removal occurs. Editors can shorten content, insert breaks, choose compatible continuation masters or use a full-width T04 story; a full-width region is not automatically invented inside a two-column page.

All contents pages remain immediately after the cover; folios and references derive from measured article starts. Preview/PDF share `magazineDocument`. Image frames have authored heights before decode; decode/dimension/missing-asset checks remain active.

`src/app/api/export/route.ts` is unchanged, including the 1 MB cap, Windows executable selection and Linux Chromium fallback. Linux was not available for execution; its logic was preserved, not claimed retested. The existing design documents, reference PDFs, sample copy, package/lock files and prior proofs remain unchanged.

## Visual comparison

All four PDFs were rasterized and their body pages visually inspected in labeled sheets. Detailed views included V20 p4/5, V17 p12, V19 p4 and V15 p5/9. No fonts were extracted. Historical reference artwork/copy is used only in review proofs, never seeded into defaults or user libraries. No unrelated imagery or chart data was invented.

The new proof has four A4 pages: existing cover/contents, T04 full-width, T04 two-column narrative. Footer labels mark it **SAMPLE / NOT APPROVED**. Both browser screenshots and final PDF rasters were visually inspected. No exact-match or visual-approval claim is made.

| Reference / comparison | Observed fidelity and gaps |
| --- | --- |
| [V20 PDF p4 / folio 2 comparison](previews/phase3c/comparison-full-width.png) | Retains pale background, 15 mm frame, tab/masthead, large chart, caption, yellow callout, small blue subheads and body rhythm. Figure starts about 1 mm lower; crop has a double outline from raster plus CSS border. Caption is more compact; the proof lacks the bold Figure 1 prefix. Callout and narrative therefore start higher. Body wrapping/paragraph positions differ; synthesized bold is heavier than original intermediate weights. Footer case/weight/sample label and calculated proof folio differ. These are implementation/proof gaps, not all missing assets. |
| [V17 PDF p12 / folio 10 comparison](previews/phase3c/comparison-two-column.png) | Retains `#D3E2F9` pale blue, two 84 mm columns, 12 mm gap, near-30 mm narrative start, blue subheads and chevrons. An authored break starts the right column. Header has straight apostrophe/left alignment instead of the reference's centered two-line treatment. Text wrapping and list/paragraph spacing differ by several millimetres. The full-width semantic table is absent because its region is deferred, not because an asset is missing. Issue/date/folios differ intentionally. |

Original screenshots: [V20 p4](previews/phase3c/reference-v20-p4.png), [V17 p12](previews/phase3c/reference-v17-p12.png). Browser renders: [full-width](previews/phase3c/generated-full-width.png), [two-column](previews/phase3c/generated-two-column.png). PDF rasters: [full-width](previews/phase3c/pdf-full-width.png), [two-column](previews/phase3c/pdf-two-column.png).

Bundled OFL Poppins Regular/Bold and Bebas Neue are retained. Intermediate/italic Poppins and licensed Impact/Bebas Bold originals are unavailable, so some weights/italics are synthesized. The comparison chart raster gets a below-150-dpi advisory; publication still needs approved original-resolution artwork. Cover logo/photo are labeled missing in this proof. These asset/font limits are distinct from table/spacing implementation gaps. Output remains RGB Chromium, not CMYK/PDF-X.

## Validation on Windows

| Check | Result |
| --- | --- |
| Typecheck and lint | Passed |
| Unit suite | 30 passed across 5 files, including all existing tests |
| Production build | Passed |
| Browser suite, isolated production port 3107 | 26 passed: all 17 prior tests plus 9 T04 scenarios |
| Short/medium/long articles | Both column counts preserve text, folios and real PDF export |
| Mixed images | Two ordered figures/captions/credits with narrative export successfully |
| Oversized atomic callout | Visible warning and HTTP 422 export rejection |
| Editor persistence | Columns and explicit block breaks survive save/reload |
| Proof | Four A4 pages; zero blocking warnings; expected asset/font/resolution notices |
| PDF inspection | A4 within Chromium rounding; final two editorial pages rasterized and visually compared |

An initial run reused an unrelated app on port 3000 and was discarded. `ECU_TEST_PORT` allows isolated testing without stopping it. Tests used installed Windows Chromium through `CHROMIUM_EXECUTABLE_PATH`. Windows reported a pre-existing false cover overflow from font descent: extending only the invisible masthead measurement box from 46 to 48 mm fixed this without moving/resizing visible type. Existing overflow regressions pass. A new test's stale ready flag was corrected by navigating to a fresh document between renders.

Locked dependencies were installed unchanged. npm reported 8 inherited advisories (1 moderate, 5 high, 2 critical); no out-of-scope audit-force fix or dependency upgrade was made.

## Changed files

| Files | Purpose |
| --- | --- |
| `.gitignore` | Ignore local PDF tools and intermediate renders |
| `playwright.config.ts` | Optional isolated test port |
| `src/domain/design.ts`, `src/domain/issue.ts` | T04/master/theme catalogs and optional editorial/figure/break fields |
| `src/magazine/templates.ts`, `src/magazine/tokens.ts` | T04 resolution and reference pale-blue theme |
| `src/magazine/page-masters.ts`, `src/magazine/pagination.ts`, `src/magazine/styles.ts` | Masthead, measured columns, atomic blocks, warnings and styling; cover measurement correction |
| `src/components/design-controls.tsx`, `src/components/issue-editor.tsx` | Editable T04/ordered figure controls |
| `src/media/render.ts` | Resolve ordered figure assets |
| `tests/editorial.test.ts`, `tests/editorial.spec.ts` | Model compatibility, text/folio/PDF, mixed images, overflow and persistence tests |
| `scripts/inspect-phase3c.py`, `scripts/phase3c-reference-data.py`, `scripts/generate-phase3c-proof.ts`, `scripts/compare-phase3c.py` | Reproducible reference inspection, proof generation and comparison |
| `docs/phase3c-plan.md`, `docs/phase3c-implementation.md`, `README.md` | Plan, report and usage |
| `docs/previews/phase3c/*.png` | Two references, two browser renders, two PDF rasters, two comparisons |
| `public/previews/ecu-phase3c-editorial.pdf` | New four-page proof; previous artifacts preserved |

## Reproduce and remaining work

Use Node 20.9+, `npm ci`, then `npm run dev -- --port 3107`. For proofs, install PyMuPDF/Pillow locally (`.tools/python` is the scripts' lookup), run `scripts/inspect-phase3c.py`, `scripts/phase3c-reference-data.py`, `npx vite-node scripts/generate-phase3c-proof.ts`, then `scripts/compare-phase3c.py`. Supply `CHROMIUM_EXECUTABLE_PATH` or use the preserved README Windows/Linux browser-install instructions. Intermediate data stays ignored under `tmp/pdfs/phase3c`.

Remaining: T04 table/side-photo/fade regions; T05–T17 in the planned batches; original licensed font weights and approved high-resolution assets; complete widow/orphan handling. No deployment, Supabase, production modification, remote push or merge occurred.
