# Phase 3A foundational architecture — implementation report

Implemented against the approved [design system](design-system.md) and [template inventory](template-inventory.md), with Volume 20 as the primary baseline and the documented earlier-volume variations. The two approved documents are preserved byte-for-byte.

## Delivered scope

- Shared design tokens for 210 × 297 mm A4, a 15 mm live-content side frame, primary blue `#034EA2`, yellow `#FFDD00`, reference-derived supporting themes and typography preferences.
- Reusable typed DOM page-master components, serialized into one self-contained measured document used identically by the preview iframe and Playwright/Chromium export. The existing cover/contents are foundation compositions; article and inset-paper masters are reusable starting points. This is not implementation of all 17 original template families.
- A validated template registry retaining `feature`, `dispatch`, `bulletin`, with `editorial` and `paper` foundations. Each story can inherit/override its section's editorial template, opening page master and continuation master independently.
- Seven visual theme presets. Issue defaults flow to sections and then stories, with explicit overrides at each level. Paper panels keep readable dark text and blue accents within the selected outer-page theme.
- Configurable section header, issue/date footer, printed folio and top-yellow-accent visibility. Cover and primary contents occupy physical pages 1–2 without printed folios; the first article is physical page 3 / printed folio 1. Printed footers use `1`, `2`, etc.; contents references use `01`, `02`, etc. Calculated references remain available even if visible footer folios are hidden.
- Section reordering/optional visibility retained. Stories can now be excluded individually without deleting their content. Existing text/block editing, add/remove/reorder, explicit save/reload, sample labeling, search/dashboard and PDF download remain supported.
- `schemaVersion: 2` and non-destructive legacy migration under the existing `ecu-connect:issues:v1` storage key. Unversioned/v1 records load with defaults; reads do not rewrite existing storage. Explicit saves write validated v2 records. Legacy IDs, copy, order, templates, dates and sample status are preserved. Unsupported future versions and unknown fields are rejected rather than silently discarded.
- A separate typed `MediaAssetRepository` contract, validated raster metadata and media references with alt/caption/credit/focal point. Its session-only memory adapter stores defensive copies of binary data separately from issue JSON. No external storage or Supabase is introduced.
- Existing overflow rejection preserved and extended to page furniture. Preview packets carry a render ID so an old detached iframe cannot supply a stale layout result. Measurement waits for fonts and an attached rendered page.

The workspace/dashboard design remains unchanged. Editor changes are compact appearance disclosures plus a section-theme selector. No dependencies were added or changed.

## Front matter and contents overflow

The approved decision requires folio 1 specifically on **physical PDF page 3**. A contents page that grows beyond physical page 2 would otherwise shift that first article. Phase 3A therefore keeps its primary contents on page 2 and places any additional contents pages **after the articles**, without printed folios. Contents is still measured, continued and fully visible; its references point to the actual body folios. The document and preview explicitly explain this placement.

This continuation arrangement is a foundation policy, not an observed original design: all four references have one contents page. A different arrangement would require changing the fixed-physical-page-3 decision. No text is clipped or reduced to fit a single contents page.

## Validation performed

| Check                          | Result                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`            | Passed                                                                                                                                 |
| `npm run lint`                 | Passed, no lint warnings                                                                                                               |
| `npm test`                     | 21 tests passed across 3 files                                                                                                         |
| `npm run build`                | Production build passed                                                                                                                |
| `CI=1 npm run test:e2e`        | 10 tests passed against an independently started production server                                                                     |
| Reference/content preservation | Hash checks confirm both design documents, the archived Phase 1 PDF, dashboard/shell/CSS and package manifests/lockfile were unchanged |
| Branch history                 | GitHub main commit `7117caabeecbf930584ffa20cf4980362197ded2` remains an ancestor                                                      |
| Real PDF proof                 | Exported successfully through `/api/export`; 9 pages, A4 metadata, visible folios 1–7 after cover/contents                             |
| Visual review                  | Full-page paper and blue-page screenshots inspected, including headers, footer and sample labels                                       |

Unit coverage includes the actual Phase 1 sample fixture, idempotent migration, v1/v2 save round trips, future/unknown data protection, selected template/master/theme persistence and inheritance, reordered/omitted sections/stories, A4/folio policy, media isolation and metadata validation.

Browser coverage retains create/edit/save/reload/PDF, narrow-screen layout, rich-text preservation across breaks, cover overflow rejection and multi-page contents checks. New checks exercise legacy-data editing, saved design controls, paper-to-article continuations, palette rendering, hidden page furniture, disabled stories, reordered content, future-schema rejection, unresolved-media export rejection and recovery from invalid unsaved preview details without losing edits. Printed-folio assertions intentionally changed from the previous physical-page `03` to contents reference `01` / visible folio `1`.

## Review artifacts

The review proof uses the existing fictional Volume 21 copy with explicit paper/cream, blue and lavender theme selections in a fresh browser context. It does not alter the shipped sample copy or any user's browser data.

- [Foundation review PDF](../public/previews/ecu-phase3a-foundation.pdf), also served at `/previews/ecu-phase3a-foundation.pdf`.
- [Paper master — physical page 3 / folio 1](previews/phase3a-paper-page.png).
- [Blue theme — physical page 4 / folio 2](previews/phase3a-blue-page.png).
- [Existing editor with foundation controls](previews/phase3a-editor.png).

The previously requested `/previews/ecu-volume-21-sample.pdf` remains the original Phase 1 artifact and is not overwritten by the new proof.

## Every Phase 3A changed file

This list is relative to baseline commit `d9d5814`, which preserved the pre-existing application and approved analysis before implementation. There are **28 Phase 3A changed/added files**.

| File                                         | Status                 | Change                                                                                                              |
| -------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                  | Modified               | Updated folio behaviour and documented foundations, migration, media boundary and proof                             |
| `next-env.d.ts`                              | Generated modification | Next production build changed generated type references from dev to production paths                                |
| `src/app/api/export/route.ts`                | Modified               | Validates/migrates legacy/current input before using the shared export document; existing export behaviour retained |
| `src/components/design-controls.tsx`         | Added                  | Small issue furniture/theme, section theme and story template/master/theme/visibility controls                      |
| `src/components/issue-editor.tsx`            | Modified               | Integrates controls and registry labels while retaining existing editing workflow                                   |
| `src/components/preview.tsx`                 | Modified               | Shows nonblocking notices and accepts layout results only from the current render ID                                |
| `src/domain/design.ts`                       | Added                  | Shared validated ID catalogs for templates, page masters and themes                                                 |
| `src/domain/issue.ts`                        | Modified               | Versioned compatible model/defaults/migration, story visibility and media references                                |
| `src/domain/media.ts`                        | Added                  | Media asset metadata and reference schemas/types                                                                    |
| `src/domain/sample.ts`                       | Modified               | Applies schema defaults to the existing sample; all sample content remains unchanged                                |
| `src/magazine/document.ts`                   | Modified               | Assembles the validated render model, shared styles, page components and measured runner                            |
| `src/magazine/folios.ts`                     | Added                  | Separates physical page index from printed article folios                                                           |
| `src/magazine/page-masters.ts`               | Added                  | Reusable cover, article/paper, header/footer/body master components                                                 |
| `src/magazine/pagination.ts`                 | Added                  | Extracted typed measured layout runner, theme/master application, overflow checks and folio/contents calculation    |
| `src/magazine/styles.ts`                     | Added                  | Shared token-driven magazine styles; independent of dashboard CSS                                                   |
| `src/magazine/templates.ts`                  | Added                  | Template registry, inheritance resolution and enabled/reordered story render model                                  |
| `src/magazine/tokens.ts`                     | Added                  | A4 geometry, blue/yellow identity, typography preferences and palette presets                                       |
| `src/media/repository.ts`                    | Added                  | Local asset repository interface and session memory adapter with defensive copies                                   |
| `src/repositories/issues.ts`                 | Modified               | Uses migrations when reading and saving; retains existing key and repository interface                              |
| `tests/fixtures/legacy-volume-21.json`       | Added                  | Actual Phase 1 sample captured from the baseline for migration/content preservation tests                           |
| `tests/foundations.test.ts`                  | Added                  | Migration, resolution, folio and media-contract unit tests                                                          |
| `tests/foundations.spec.ts`                  | Added                  | Browser tests for design persistence/rendering, continuations, furniture and export validation                      |
| `tests/workflow.spec.ts`                     | Modified               | Updated printed-folio assertions and valid long-text fixture; preserved full workflow coverage                      |
| `docs/phase3a-implementation.md`             | Added                  | This implementation/file/validation/limitations report                                                              |
| `docs/previews/phase3a-paper-page.png`       | Added                  | Full-page foundation paper master screenshot                                                                        |
| `docs/previews/phase3a-blue-page.png`        | Added                  | Full-page blue-theme screenshot                                                                                     |
| `docs/previews/phase3a-editor.png`           | Added                  | Screenshot of the preserved editor with new controls                                                                |
| `public/previews/ecu-phase3a-foundation.pdf` | Added                  | Separate generated foundation proof; archived sample retained                                                       |

## Git preparation and preserved files

Dedicated branch: **`phase3a/foundations`**, based on the existing GitHub main history. The initial baseline commit `d9d5814` commits 33 previously uncommitted builder/analysis files without modifying their existing contents. The Phase 3A implementation is a separate commit on top of that baseline. The approved design documents are therefore committed locally and preserved; the original GitHub PDF references remain in the inherited history.

No force-push, history replacement, deployment or Supabase connection was performed. This branch has not been pushed to GitHub. It is prepared locally for review; publishing a branch/PR is a separate action.

## Remaining limitations

- Only article and paper **foundation** masters plus retained cover/contents composition are supplied. The 17 original visual families, original photographic cover/contents, galleries, notices, culture-code spread, holiday tables and back page remain later work.
- No original Poppins/Impact/Bebas font files have been supplied or extracted. CSS prefers installed original families but otherwise uses system fallbacks; the preview reports this explicitly. Exact licensed-font metrics and original typographic fidelity remain unverified. No official logo or original image assets were added.
- Media metadata/reference/repository interfaces are ready for extension, but upload UI, durable local asset storage and image placement/rendering are not implemented. The memory adapter lasts only for its session. A nonempty media reference blocks export with an explicit warning rather than silently omitting the image.
- Contents remains a basic story list, not the full original yellow grouped two-column design. Overflow continuations follow the body to guarantee the requested physical-page-3 start.
- Pagination is single-column text, with an optional paper inset. Widow/orphan controls, semantic table/gallery pagination, image crop/resolution/decode checks and special-master composition await their templates.
- Page furniture is configurable at issue level. Giant numbered section-openers and arbitrary custom furniture positions are not implemented in this phase.
- The PDF path still produces an RGB Chromium editorial proof, not CMYK/PDF-X or commercial bleed/crop marks. Chromium rounds A4 dimensions slightly in its PDF metadata (this proof reports approximately 594.96 × 841.92 pt).
- LocalStorage remains origin/browser-specific; there is no cross-device storage, collaboration or approval workflow.
