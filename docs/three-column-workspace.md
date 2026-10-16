# Three-column magazine workspace

Implemented in D:/Creashna/GitHub/ecu-connect-magazine on feature/editor-ux-redesign. Changes remain uncommitted for review; no push, merge, reset or deployment.

## Scope

The editor uses a viewport-wide Stories / Editor / Live Preview layout, defaulting to 23 / 42 / 35 percent of available panel space. Two pointer- and keyboard-operable dividers adjust the boundaries; double-click either divider to restore the default. Each column scrolls independently. The dashboard and Page Templates retain their application navigation. ECU Connect in the editor's compact header returns to the dashboard, retaining the unsaved-change confirmation. Save status, volume, Save Magazine and Export PDF remain visible.

The Stories panel follows the written specification confirmed by the user: bold section labels, consistent colored section icons, collapsible nested stories, current-story highlighting and Add story. Drag a section onto another section to reorder. Drag a story onto another story to insert before it, or onto a section heading / Add story row to append to that section. Moving the selected story retains its complete content and updates its section selection. Section up/down controls, the existing editor's story up/down controls, and per-story section selectors provide keyboard/touch alternatives. Changes use the existing save flow and renderer so contents order and folios are recalculated.

Editing fields and workflows are retained in the middle column. Poppins, white surfaces and original magazine colors remain. At small phone widths, Edit / Preview tabs preserve mounted state.

## Preview

A preview-only bridge fits each complete A4 page to both available width and height, centered in its viewport. Manual zoom and page selection remain available. Selected stories navigate using measured physical-page mappings, including after sequence changes.

Full-screen preview is a viewport overlay using the same mounted iframe. Every thumbnail is cloned from an actual measured magazine page, including its original fonts, images and furniture. No alternative page renderer or invented thumbnail is used. The horizontal strip supports clicks and active-page highlighting. Arrow keys work from both toolbar and frame, Escape closes, keyboard focus stays within the preview, and closing restores the editing scroll position. Thumbnail creation happens only when opening full-screen.

Magazine sources in src/magazine, domain/media schemas and src/app/api/export are unchanged. Preview scaling, stages and thumbnails are injected only into the on-screen document after measurement; PDF export continues to use the original document.

## Verification

- TypeScript, ESLint, 37 unit tests and production build pass.
- All 49 browser/PDF tests pass (final complete run: 44.7 seconds).
- Browser suite covers desktop ratios, both resize methods, independent scroll, typing/selection, drafts/save, section and story drag ordering, cross-section moves, live contents order, full-screen thumbnails/keyboard/return, Page Templates and real PDF exports.
- Resolution checks include 1920x1080, 1600x1000, 1366x768, 1024x768, 900x1000 and 390x844. The editor owns viewport scrolling, eliminating inherited document scroll offsets when moving between responsive layouts.
- Identical-input magazine HTML and PDF bytes match baseline 70579d3 after PDF timestamp normalization. Evidence: workspace-pdf-invariance.json.
- next-env.d.ts and the existing transfer backup remain unchanged.

Local screenshots: test-results/workspace-desktop.png, workspace-fullscreen.png and workspace-tablet.png. These are ignored verification artifacts.

## Local use and limits

Run npm run dev and open http://localhost:3000. Resized widths apply for the mounted session and return to defaults after reloading. Native drag-and-drop targets desktop pointer input; use the equivalent controls with keyboard or touch. Automated browser/PDF validation uses bundled Chromium; other browser engines were not exercised. Existing local-browser storage and PDF/image limits remain unchanged.

## Changed files

- src/app/studio.css
- src/components/issue-editor.tsx
- src/components/shell.tsx
- src/components/split-workspace.tsx
- src/components/stories-panel.tsx
- src/components/preview.tsx
- src/components/preview-document.ts
- src/studio/reorder.ts
- tests/editor-ux.spec.ts
- tests/live-editor.spec.ts
- tests/studio-ui.spec.ts
- tests/workspace.spec.ts
- tests/workspace.test.ts
- docs/three-column-workspace.md
- docs/workspace-pdf-invariance.json
