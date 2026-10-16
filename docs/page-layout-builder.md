# Page Layout Builder — focused Column 2 update

## Scope and preservation

Worked only in `D:\Creashna\GitHub\ecu-connect-magazine`, on the existing `feature/editor-ux-redesign` branch. Pre-task builder files were copied to `.cache/page-builder-backup-20261015-214056`. Existing uncommitted work was preserved.

Headline (`title`), Introduction (`subtitle`), Author (`byline`) and Article Content (`blocks`) remain the canonical story fields. Their editor component is unchanged. Columns 1 and 3, shared application CSS, approved magazine template/style files, `next-env.d.ts` and its original backup were not edited by this task.

## Implementation

- Small row insertion buttons open five layouts: full width, 50/50, 70/30, 30/70 and three columns.
- Each cell offers Add Content → Linked Content or Manual Content. Linked placements resolve current official fields at render time. Article Content links participate in the existing measured flow rather than copying the article.
- Manual placements support H1–H6, paragraphs, bulleted/numbered lists (one item per line), images using the existing upload picker, quotes, dividers and spacers. Manual text/images are stored only in the optional grid placement data and never overwrite official story fields.
- Multiple ordered blocks per cell, handle-based dragging within/between cells, insertion indicators, contextual duplicate/delete, accessible Move up/down alternatives and existing draggable/keyboard column resizing are retained. A cell accepts one Article Content flow marker; multiple cells can consume the same continuing article stream without repeating it. Article Content markers cannot be duplicated within the same cell.
- Opening/continuation variants, grid undo/redo and layout presets reuse existing architecture. Presets strip manual content and image references in both variants; linked bindings receive fresh placement IDs on reuse. Shrinking columns retains placements. Removing a row or switching to an approved template explicitly confirms removal of manual blocks; official source content stays intact.
- Optional placement schema keeps old saved magazines compatible. Shared grid-only rendering/image resolution additions make preview and export use the same logic. The original non-grid template styles are unchanged. Explicit metadata placements suppress duplicate opening metadata, while automatic contents always read `story.title`. Folios still come from measured pagination.

## Files changed in this task

- `src/components/grid-editor.tsx`
- `src/components/layout-cell-content.tsx` (new)
- `src/components/layout-cell-content.css` (new, builder scoped)
- `src/domain/grid.ts`
- `src/studio/grid-layout.ts`
- `src/magazine/grid-flow.ts`
- `src/magazine/pagination.ts` (optional grid metadata placement and manual-image validation only)
- `src/media/render.ts` (resolve manual grid images through the existing pipeline)
- `tests/grid.spec.ts` (new picker labels)
- `tests/page-layout-builder.test.ts` (new)
- `tests/page-layout-builder.spec.ts` (new)
- This document. The existing template-compatibility report was regenerated using the existing verification script.

## Verification

Typecheck, lint, 53 unit tests, production build and 63 browser/PDF regression tests passed. Builder coverage includes automatic updates from all four official fields, independent manual content, duplication/deletion, within/across-cell dragging, resized widths, save/reload, opening/continuation variants, manual images/lists, long article flow, and contents/actual folios for a following story. Narrow-screen picker positioning is also covered.

The existing template compatibility script confirmed identical PDFs (except creation timestamps) and pagination for all seven approved templates against the preserved baseline. Protected-file SHA256 checks confirm Columns 1/3 and official field components remain unchanged.

## Practical limits

Manual blocks are fixed placements in their row. Content too large for an A4 row produces the existing overflow warning and blocks export; it is never silently reduced or removed. Linked Article Content is the supported continuously paginated text stream. Manual content placed in a continuation layout repeats with that layout; linked article text continues without repetition. Desktop block drag handles have Move up/down alternatives for keyboard/touch use.

No commit, push, merge, deployment or database changes were performed.
