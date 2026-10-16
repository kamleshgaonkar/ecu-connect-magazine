# Stories controls and drag behavior

Implemented in `D:\Creashna\GitHub\ecu-connect-magazine` on `feature/editor-ux-redesign`. Existing uncommitted workspace/grid work was preserved first in `.cache/stories-controls-backup-20261015-210327`, including a binary Git patch and copies of modified/untracked files.

## Behavior

- Minimal section headings, colored icons, nested story titles, expansion controls and Add Story remain. Repeated story section dropdowns and the Story Editor inclusion checkbox are removed.
- Section/story Eye controls use the existing `enabled` fields. Section hiding masks its children without changing their flags. Hidden content stays editable and saved. Controls appear on hover, focus or selection, and remain available on touch devices.
- The old whole-row native HTML drag sources and nested drop handlers were replaced by one pointer sensor initiated only by grip buttons. A fixed-width vertically anchored overlay follows the pointer; stable list geometry determines a single typed insertion target. Order changes only on drop, avoiding competing parent/story targets and feedback-driven layout shifts.
- Pointer moves support section ordering, story ordering and cross-section insertion. Stories auto-scroll independently near their container edges. Expansion state remains unchanged. Space/Enter picks up or drops; arrows choose slots; Escape cancels. Moving into a full section is rejected rather than losing content.
- Save Magazine persists the existing ordered data. Existing rendering logic filters visibility and generates magazine order, contents and folios. Preview, grid, approved templates and PDF styling were not changed.

## Files changed for this task

- `src/components/stories-panel.tsx`
- `src/components/stories-panel.css`
- `src/components/use-stories-drag.ts`
- `src/components/issue-editor.tsx` (Stories callbacks and removal of the story checkbox only)
- `src/studio/reorder.ts`
- `src/studio/visibility.ts`
- `tests/helpers/stories-drag.ts`
- `tests/stories-controls.test.ts`
- `tests/stories-panel.spec.ts`
- `tests/workspace.spec.ts` (handle-based pointer gestures)
- This document.

## Verification

Typecheck, lint, 48 unit tests, production build and all seven focused Stories/workspace browser tests passed. All 60 browser/PDF regression tests passed. The visibility PDF test compares exported output with an equivalent explicitly filtered issue, ignoring creation timestamps, and checks page count, contents and sequential article folios. Pointer checks cover handle-only pickup, horizontal anchoring, cancellation, within/across-section drops, section moves, expansion preservation, independent auto-scroll and persisted order. Existing desktop, tablet, mobile and grid tests remain in the full suite.

SHA256 checks confirmed all 18 protected pre-task files were unchanged, including Column 3, grid editor/domain, magazine renderer/styles, `next-env.d.ts` and its original backup. No data migrations, push, merge or deployment were performed.

## Interaction details

An enabled story inside a hidden section keeps its Eye state with the tooltip "Visible when its section is restored"; its row is faded because its effective magazine visibility is off. A collapsed destination accepts a story at the end without opening it. The insertion line shows the drop boundary while the source list stays stable until drop.