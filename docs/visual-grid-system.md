# Workspace and visual grid system

Implemented in D:/Creashna/GitHub/ecu-connect-magazine, on feature/editor-ux-redesign. All changes remain uncommitted for review. Nothing pushed, reset, merged or deployed.

## Preservation

Existing uncommitted three-column work was backed up before editing to .cache/visual-grid-backup-20261015-201623. The backup contains every modified/untracked file, a binary working.patch, next-env.d.ts and its original transfer backup. No work was discarded. The old duplicate repository was not used. Current next-env.d.ts SHA256 remains 1B59D4C6B83807DB275D43F3CF2CC8E9323F465FAB764EEA091CC5BECD5BAD37; the original transfer backup remains B8B3A344484B959AF5E4E3FC1A1609DAC3CB9ECE0CDEB6C145BE29BC4C491000.

## Workspace and preview

The 23/42/35 resizable workspace, independent scrolling, full-width editor shell, dashboard return, volume/save status, top-bar PDF export, Poppins and Stories operations are retained. Section icons use the requested blue book, teal globe, amber notice, purple star, orange building, pink people and green calendar identities.

Permanent preview headings, navigation rows and success notices are removed. A compact dark toolbar overlays the bottom of the preview, revealing on hover or focus. Touch devices have an explicit reveal control. It includes page navigation, zoom, Fit Page, full-screen and a secondary review menu. Only export-blocking errors remain permanently visible. The whole A4 page fits the available width and height. Full-screen retains the actual-page thumbnail strip, keyboard navigation, active thumbnail, and return position.

## Content and layout architecture

Story blocks remain the canonical article, including paragraphs, headings, figures/captions/credits, quotes, lists, callouts, bold and italic. Standalone captions are also supported. Layouts reference blocks by ID; linked cells consume the unassigned article stream in reading order. Adding, deleting, rearranging, resizing or applying a preset does not remove source text or image assets. Deleting a row confirms that its content returns to the linked stream. Duplicating a row duplicates its containers and rules, not the underlying article. Undo/redo covers layout operations; source text retains native editing/selection behavior.

An optional validated story.grid extends schema version 2 additively. Old magazines load without being rewritten or acquiring a grid. The approved template remains the render path until the user changes a layout. Returning to Use approved template layout removes only custom placement. Unknown/missing content references, repeated assignments and invalid geometry are rejected before saving. No database migration or Supabase changes are involved. Older application revisions do not understand the optional grid/caption fields; use this version to edit magazines saved with them.

The row picker shows diagrams for full-width, equal halves, 7:5 and thirds. Contextual settings allow one through four custom-weight columns, pointer/keyboard boundary resizing, automatic/minimum/fixed height, spacing, padding, alignment, linked cells, keep-together and page breaks. Row menus supply duplicate/remove and accessible move actions. Canonical article content has explicit drag handles, type/format controls, image upload/framing/captions and content ordering/removal. No technical row names are displayed.

Grid cell excerpts come from the actual measured preview fragments, rather than an independent character-count layout simulation. Before opting into custom geometry, the canvas shows an article excerpt while the original template remains active. Uploaded image thumbnails use the original local asset bytes.

## Measured text continuation and printing

There is one magazine document and one paginator for preview and PDF. flowGridStory is a hook inside the existing paginator, using the same page-master creation, font readiness, styled DOM nodes, Unicode-safe styled slicing, margins, footer/folios, contents and image preparation. No alternate magazine renderer or generic website page styling was introduced. Existing page-master artwork, colors, fonts, cover, contents and furniture are unchanged.

Each row measures its cells against the actual body rectangle. Text fragments are fitted by DOM measurement with the real magazine fonts. Automatic rows reserve space for following linked rows; mixed text/image rows use the measured image/caption height. Remaining text feeds the next linked cell, then the configured continuation columns on fresh A4 pages. The large opener is not repeated. Paragraph/block boundaries and formatting are retained; splitting prefers word/newline boundaries, and heading probes avoid practical orphan cases. Keep-together defers whole blocks to another linked container when needed. Genuinely impossible fixed rows, wide content, oversized atomic objects or no-progress continuation create visible blocking warnings, without deleting source data or shrinking typography.

## Reusable layouts

Presets are stored locally under ecu-connect:grid-presets:v1 and selected with inline diagrams. They preserve row/column settings, flow connections, typed content slots, image sizing/fit rules and continuation settings. They contain no article text, block assignments, asset IDs or binary media. Applying a preset creates fresh layout IDs and binds compatible typed slots to the current story, leaving the source content intact. Corrupt storage/quota errors are surfaced; existing stored presets are not overwritten on parse failure.

## Verification

Typecheck, ESLint, 43 unit tests and production build pass. All 56 browser/PDF tests pass (final complete run: 49.5 seconds). Browser/PDF tests cover legacy loading/saving, section/story moves, grid row creation/duplication/removal and native drag ordering, content moves, column resize, undo, preset reuse, linked long styled text, image-height reflow, manual breaks, fixed-row overflow blocking, equal preview/PDF page counts, contents/folios, floating hover/focus, resolutions, full-screen navigation and existing templates.

The compatibility script compares every existing story template (seven variants, each with cover and contents) against the preserved 70579d3 renderer. Pagination and PDF bytes match after creation/modification timestamp normalization. The HTML source now differs because it contains the grid hook; print output for unchanged input is unchanged. Evidence: grid-compatibility.json. The existing sample PDF comparison remains byte-identical except timestamps as well.

## Practical limits and remaining scope

- Rows support 1–4 columns and at most 60 opening rows. A story retains the existing 100-block/20,000-character-per-block limits.
- Opening and continuation layouts each use the same visual canvas. Continuations support up to 12 independently configured rows with custom proportions, heights, spacing, alignment and linked flow. Static content assignments are kept out of repeated continuation layouts to prevent unintended duplication; images in the article stream continue through linked cells.
- Approved hero artwork, header/footer and page masters remain protected; grid editing operates inside their existing content region.
- The canvas is a structural editor with measured excerpts, not a second full-fidelity page compositor. The live preview is the authoritative composed page.
- Native drag-and-drop targets desktop pointer input; move actions and section selectors remain available for keyboard/touch workflows.
- Presets and magazines stay in this browser. Column sizes and layout undo history are session-local. Existing image/export size limits and original font-fidelity notices remain.
- Automated browser and PDF verification uses bundled Chromium; other engines have not been exercised.

## Run locally

npm run dev, then open http://localhost:3000. For production validation: npm run typecheck, npm run lint, npm test, npm run build, npm run test:e2e. To reproduce print compatibility, set PLAYWRIGHT_BROWSERS_PATH to .cache/ms-playwright and run npx vite-node scripts/verify-grid-compatibility.ts with the preserved .cache/studio-baseline source available.

Screenshots: test-results/visual-grid-editor.png, test-results/workspace-fullscreen.png and responsive workspace screenshots (ignored local verification artifacts).

## Current changed files, including preserved workspace work

- docs/grid-compatibility.json
- docs/three-column-workspace.md
- docs/visual-grid-system.md
- docs/workspace-pdf-invariance.json
- scripts/verify-grid-compatibility.ts
- scripts/verify-live-editor-pdf.ts
- src/app/studio.css
- src/components/grid-editor.tsx
- src/components/issue-editor.tsx
- src/components/preview-document.ts
- src/components/preview.tsx
- src/components/shell.tsx
- src/components/split-workspace.tsx
- src/components/stories-panel.tsx
- src/domain/grid.ts
- src/domain/issue.ts
- src/magazine/document.ts
- src/magazine/grid-flow.ts
- src/magazine/pagination.ts
- src/studio/grid-layout.ts
- src/studio/reorder.ts
- tests/editor-ux.spec.ts
- tests/foundations.spec.ts
- tests/grid.spec.ts
- tests/grid.test.ts
- tests/live-editor.spec.ts
- tests/studio-ui.spec.ts
- tests/visual-templates.spec.ts
- tests/workflow.spec.ts
- tests/workspace.spec.ts
- tests/workspace.test.ts
