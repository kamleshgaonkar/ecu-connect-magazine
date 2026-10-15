# Live split-screen editor

Implemented in the correct checkout, `D:\Creashna\GitHub\ecu-connect-magazine`, on `feature/live-split-editor`, based on Phase 3C commit `455e186735d8743b214534e109245af82da6a073`. This is workspace UX work only. Phase 3C Batch 2 has not started.

## Behavior

Desktop widths above 850 px show the existing editor and real A4 preview together, initially 60% / 40% of the available workspace. A pointer-captured divider adjusts the editor from 40% to 75%. Keyboard Left/Right changes it by 2%; Home/End select the bounds; double-click restores 60%. The header/Save controls stay visible. The editor scrolls independently; magazine scrolling belongs to its iframe. Constrained grid tracks and a positioned editor contain off-screen accessible labels so they cannot expand the outer document.

At 850 px and below, keyboard-accessible Edit/Preview tabs switch the visible panel. Both remain mounted, retaining draft values, selections, disclosures and preview state. Wider tablets use the split arrangement; narrow tablets use tabs. Tests cover 390, 900, 1280 and 1600 px widths without outer horizontal overflow.

The editor's issue state remains authoritative. Preview preparation and full-issue pagination are debounced by 300 ms, with stale async work/results rejected. Editing never remounts the editor or keys the preview by issue JSON. Rich-text selection/cursor and existing image editing/upload flows remain intact. Image bytes are neither compressed nor resized. The previous measured preview can remain visible while a new revision is pending, clearly labeled Updating preview; export is disabled until the current revision is measured and valid.

Preview page navigation, next/previous controls, zoom (10–200%) and Fit to width operate through a narrow render-ID-scoped message bridge. Whole-page visual scaling starts only after original A4 pagination completes. Native iframe scrolling updates the current physical-page selector. Fit follows panel resizing. Selecting a section/story or focusing a story field navigates to its actual measured start where present. Subsequent typing in the same story preserves the current physical page instead of repeatedly jumping to its beginning.

Missing/corrupt-image warnings, unresolved overflow and 1 MB PDF-size errors still block export. Advisory font/resolution/sample notices are in an expandable Preview notes disclosure. Existing explicit Save, unsaved-change warnings, section/story order/visibility and origin-local persistence remain unchanged. No autosave or storage migration was introduced.

## Print invariance

No files in `src/magazine`, `src/domain`, `src/media`, or `src/app/api/export` were changed. No magazine typography, colors, backgrounds, cover/contents/furniture or section templates changed. The preview's bridge is injected only by the UI; PDF export still receives the original prepared issue and uses the unchanged document/route.

The validation script compared an archived renderer from commit 455e186 against the current renderer using identical sample input and render ID:

- Document HTML: byte-identical.
- PDFs produced by the same installed Chromium: byte-identical after normalizing PDF creation/modification timestamps.
- Each PDF: 90,323 bytes.
- HTML SHA-256: `cd21f0f2cbd2c1ad5755800dbe9c206b298180554ddf0c0b9302aa1c391d2bf2`.
- [Recorded evidence](live-editor-pdf-invariance.json).

This is a deterministic same-environment comparison. Different Chromium/font versions may generate different PDF bytes; it is not a new visual-approval claim. Existing browser tests also exercise real PDF downloads, long articles, folios/contents, mixed figures, warnings and the preserved request-size limit.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| ESLint | Passed |
| Production build | Passed |
| Unit tests | 30 passed, 5 files |
| Browser/PDF tests | 31 passed: all existing 26 plus 5 workspace scenarios |
| PDF invariance | Identical HTML and normalized PDF against 455e186 |
| Visual inspection | Desktop split/editing and mobile screenshots inspected |
| Preservation | Original next-env.d.ts edit and its existing backup hash remain identical |

New browser coverage checks initial split ratio, independent scroll, pointer/keyboard resize, fixed Save visibility, no outer overflow, automatic updates, blocked stale export, focus/text selection retention, story navigation, page/zoom/fit controls, A4 proportions, mobile tab retention and tablet layout. Existing browser tests were adapted to automatic desktop preview without removing their content/persistence/PDF assertions.

Screenshots: [desktop split](previews/live-editor/desktop.png), [live editing](previews/live-editor/editing.png), [mobile](previews/live-editor/mobile.png).

## Changed files

- `src/components/split-workspace.tsx`: responsive persistent panels, tabs and accessible divider.
- `src/components/issue-editor.tsx`: integrates panels and active story selection; retains all editing controls.
- `src/components/preview.tsx`: debounced current-revision preparation, page/zoom controls, warnings and PDF readiness.
- `src/components/preview-document.ts`: isolated preview-only iframe controls.
- `src/app/globals.css`: workspace-only responsive sizing/scroll/control styles.
- `tests/live-editor.spec.ts`: five new browser scenarios.
- `tests/workflow.spec.ts`, `tests/foundations.spec.ts`, `tests/visual-templates.spec.ts`: existing UI assertions adapted for live preview.
- `scripts/verify-live-editor-pdf.ts`: baseline HTML/PDF comparison.
- `docs/live-split-editor.md`, `docs/live-editor-pdf-invariance.json`, `docs/previews/live-editor/*.png`: report, evidence and screenshots.
- `README.md`: local use and controls.

The pre-existing `next-env.d.ts` modification is intentionally excluded from the feature commit. Its backup remains at `.cache/phase3c-transfer-455e186/next-env.d.ts.original`. Builds regenerate this Next.js file; validation restored the exact pre-existing bytes afterward, without changing the backup.

## Run and reproduce

From this checkout:

```powershell
npm run dev -- --port 3119
```

Use your usual host/port to access previous browser-local drafts and images: browser storage is origin-specific, so another port has a separate local library. Tests ran on isolated port 3119 because another service occupied 3107. No other service was stopped.

For tests, use the existing Chromium installation or set `CHROMIUM_EXECUTABLE_PATH`, set `ECU_TEST_PORT=3119` and `CI=1`, then run `npm run test:e2e` after building. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` as usual, preserving the local generated-file edit when rebuilding.

To recreate the print comparison, archive `src/domain` and `src/magazine` from 455e186 into the ignored `.cache/live-baseline` directory (Git archive, not a checkout/reset), then run `npx vite-node scripts/verify-live-editor-pdf.ts`. The script reads that archive and writes ignored validation evidence under `.cache/live-editor-validation`.

## Limits

- Pagination still measures the full issue after the debounce; very large editions can take longer.
- Divider ratio, zoom and current preview page are session-only UI state.
- Page retention uses physical page numbers; substantial reflow can shift content within that page. Newly selected stories use their recalculated starts.
- Enlarged zoom may require horizontal scrolling inside the preview iframe; the outer workspace remains within the screen.
- The existing 1 MB export limit and origin-local storage limits remain.

No remote push, merge, deployment, Supabase change, reset or Batch 2 work was performed.
