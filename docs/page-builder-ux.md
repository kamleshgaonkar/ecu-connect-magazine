# Page Builder UX: direct editing and Quick Add

## Scope

This update changes only Column 2's builder UI. Work was completed in `D:\Creashna\GitHub\ecu-connect-magazine` on `feature/editor-ux-redesign`. Existing work was preserved before editing at `.cache/page-builder-ux-backup-20261015-225125`.

No data schema, migration, magazine template, PDF style, pagination or rendering logic changed. Headline, Introduction, Author and Article Content remain the official story data. Hash verification covers 24 protected files, including their editor, Columns 1/3, all magazine rendering files, shared application CSS, domain/grid helpers, media resolution, `next-env.d.ts` and its original backup.

## Interaction changes

- Manual text blocks are directly editable native text surfaces: click and type. Lists store one item per line; Enter inserts the next item. Textareas retain cursor/selection and grow with their content, with bounded scrolling for long text.
- Linked Headline, Introduction and Author are also directly editable and update their official fields. Clicking a linked Article opens its existing source blocks for immediate editing; block IDs, types, formatting syntax and image references are preserved. Manual headings stay in the grid and never become automatic index entries.
- Add Content now opens one grouped, searchable menu containing all linked and manual types. Search focuses automatically; Enter inserts the first match, Down selects a result, Up/Down/Home/End navigate results, and Escape closes the menu and returns focus. No category click or Back step is needed. New text blocks receive focus immediately.
- Labels, drag handles and actions appear in a small floating toolbar on hover, keyboard focus or selection. Duplicate and delete are one click. Move controls and relevant heading/list/image/spacer options are in its contextual menu. Image uploads reuse the original MediaPicker; existing preview rendering was extracted unchanged into GridImage for reuse.
- Empty cells retain Add Content but lose the permanent drop instruction. Linked Text checkboxes and repeated Layout Settings summaries are removed. The row's contextual Row options button exposes the existing dimensions, spacing, alignment, column settings and flow toggles. The + row picker remains unchanged.
- Existing handle dragging, column resizing, opening/continuation variants and presets are retained. Manual text edits are grouped into one layout undo step per uninterrupted focus session. Canonical source fields retain native text undo; layout undo does not rewrite official story data.
- Menu stacking and pointer-event handling prevent invisible neighboring controls from intercepting open menus. Selection uses the event's original path before React changes an edit surface, and linked article editing activates after native click focus completes.

## Files changed in this task

- `src/components/grid-editor.tsx`
- `src/components/layout-cell-content.tsx`
- `src/components/layout-cell-content.css` (all rules scoped to the builder)
- `src/components/grid-image.tsx` (existing helper extracted without rendering changes)
- `tests/page-layout-builder.spec.ts` (adapted existing interactions)
- `tests/page-builder-ux.spec.ts` (five new browser cases)
- This document.

## Verification

TypeScript, lint, all 53 unit tests, production build and all 15 focused UX/grid/PDF browser tests passed. All 68 browser/PDF regression tests passed, including desktop, tablet and mobile coverage. Coverage includes direct editing, caret/selection stability, Enter lists, keyboard search/insertion, contextual controls, source field synchronization, index integrity, grouped undo/redo, duplication/deletion, row/column resizing, within/across-cell drag, save/reload, responsive picker bounds, continuation flow, actual folios and PDF export.

Screenshot: `test-results/page-builder-ux.png`.

No new dependencies, commit, push, merge, deployment or database changes were made. Existing A4 limits and overflow protection remain unchanged; layout undo history remains in-memory, as before.
