# Headline Layout, Story Badge and click-to-edit navigation

Implemented on `feature/editor-ux-redesign`, over the existing uncommitted Background Design, contrast, credits, local-image and PDF improvements. Base commit remains `c0e50e501fbafb2af13e311e9bc9439d1d260804`. No commit, push, merge or deployment was performed.

## Editor behaviour

**Headline Layout** is a native, keyboard-operable collapsible control immediately below Headline in Column 2. **Story Badge** is another compact collapsible control between Subheadline and Author. Both start collapsed. Existing workspace proportions and Page Builder controls are retained.

Optional `story.headlineLayout` and `story.badge` metadata use the existing issue repository and schema-version-2 persistence. Older records gain neither setting automatically; no database migration, bulk rewrite, storage service or dependency was introduced. Resetting layout removes the optional configuration. Disabling a badge retains its text/style for later reuse.

## Opening headline rendering

- Above Image, Below Image or Custom placement; optional vertical position in millimetres from the top of A4. Leaving it blank uses the template or image-relative automatic position.
- Left, Centre or Right alignment; 20–100% headline-group width; optional 16–60 pt font preference and 1–1.8 line spacing.
- Auto, 1, 2, 3 or 4 lines. Auto leaves the selected/original font size alone. A numbered count measures actual loaded-font line boxes and searches 16–60 pt in quarter-point steps for the closest usable size to the font preference. Impossible counts produce a visible blocking layout warning; no ellipsis, clipping or text deletion is used.
- Manual breaks use `white-space: pre-wrap` in a separate display override. The canonical `story.title` is never changed by this control and remains the contents/index title. Without manual text, the display follows the existing opening override or canonical headline. “Use synced headline” removes the manual-text override; “Reset headline layout” restores template typography/positioning.
- The badge and headline share one measured group. Width/alignment apply to that group; the subheadline and narrative keep their existing width and typography.

Measurement runs **before** body/grid pagination and after fonts load, through the same serialized renderer for live, fullscreen and Chromium PDF. Custom vertical placement reserves remaining opening-body space so text continues naturally instead of overlapping the heading. It can therefore legitimately change story page counts and final-page credit placement. Continuations retain their existing masters and do not receive a new headline or badge.

Image-relative placement uses the opening page's own background override before the inherited story background, including top/centre/bottom coverage. It also supports original photographic opener masters and the first existing inline story image. For an inline image, Below Image orders that image before the heading while preserving the saved media list. A background spanning the full A4 height has no space outside it: automatic placement insets the headline over its top/bottom region, reserving furniture and some narrative space. With no applicable image, the original template position is retained unless a vertical position is supplied. Fades continue to render independently; Text Contrast samples the final headline position.

Automatic top placement respects section identity furniture. Explicit positions are allowed to remain visible, but collisions with the section number/name, yellow accent or footer, oversized text and impossible line fitting warn and block PDF export. They are never silently corrected by clipping or arbitrary shrinking.

For saved linked-headline grids, opting into the new headline group preserves the saved linked block/data but suppresses its duplicate display. Resetting layout and disabling the badge restore the previous linked placement. Manual article headings and article content are not removed.

## Story badges

Each story independently controls enablement, text (up to 80 characters), background/text colours, 7–18 pt font size and 0–12 mm corner radius. The default is a compact black rounded pill with white text, using existing bundled magazine typography. No new brand assets or fonts were introduced.

The badge sits above the opening headline with a measured gap and follows its alignment/position. Explicit badge colours are excluded from automatic contrast changes. Long badges wrap instead of being truncated; oversized placements participate in overflow warnings.

The existing two-column contents renderer includes enabled, nonempty badges with their canonical story entries. Contents badges use a compact font capped at 9 pt, retain chosen colours/radius, and are measured before contents pagination. Contents pages remain contiguous after the cover; article folios and all contents references reflect final pagination.

## Click selection and independent browsing

Only the `preview-page-click` message can request editor selection. Scroll position messages contain browsing page/zoom only; they carry no story-selection data. There is no IntersectionObserver or scroll-driven selection handler.

Clicking a real article page in Column 3 resolves its stable story ID and existing story-relative page ordinal. It selects/highlights the story in Column 1, expands its section, opens the story in Column 2, selects Opening/Continuation, retains issue-wide unsaved edits and outlines the selected page. Repeatedly clicking the same page also restores the correct Page Builder variant after manually switching variants.

Mouse-wheel and programmatic scrolling, zoom/fit, resize, page dropdown/arrows, fullscreen page clicks and fullscreen thumbnails only browse. They never change editor story/page selection. Cover/contents clicks have no story selection target. Click messages from stale/incomplete renders are ignored.

Physical PDF numbers are not editor identity: story ID plus story-relative ordinal survive preceding page shifts, contents growth and section reorder. Reflow keeps that association. If the selected ordinal disappears, the story remains selected, a notice asks for an explicit new page click, and background page overrides are disabled rather than silently targeting another page. Existing page overrides still use the repository's story-relative ordinal model; this does not introduce persistent page UUIDs or content-anchor tracking when paragraphs move between pages.

## Verification and limits

Typecheck, lint, **73 unit tests** and production build pass. The focused/regression Chromium run includes **32 browser tests**, covering:

- Legacy safe defaults, valid/invalid settings, repository save/reload and canonical metadata.
- Actual font fitting, manual breaks, Auto, impossible line-count diagnostics and blocked PDF export.
- Top/bottom/full-bleed backgrounds, custom positioning, inline images and section-furniture protection.
- Badge colours, placement, continuation exclusion and multiple contents pages with real folio references.
- Explicit opening/continuation clicks, repeated clicks, collapsed-section expansion, unsaved edits, scrolling, fullscreen browsing, reordered physical pages and removed-page reflow.
- Existing backgrounds/page overrides, credits/contrast, local image persistence, populated grid preservation, new sections, responsive workspace and high-resolution PDF export.

This is a targeted browser run, not a claim that every historical test for previously hidden editor controls was run. Tests use deterministic local sample content and generated raster fixtures, not approved ECU announcements or new stock assets. Windows-local rendering, physical trackpad hardware, non-Chromium browsers and print production remain unverified. Existing bundled font fallbacks remain in force; exact original licensed-font fidelity is not claimed.

The opening-page screenshot was visually compared with a rasterized PDF page: headline breaks, badge position/colours, subheadline and furniture align. PDF text extraction retains canonical contents text and the separate display headline. No claim of pixel-identical rasterization across different engines is made.

Review artifacts, ignored and regenerable:

- `test-results/headline-controls.png` — the controls and unchanged three-column workspace.
- `test-results/headline-opening.png` — styled opening with an explicit-colour badge.
- `test-results/contents-badge.png` — generated contents badge and canonical title.
- `test-results/headline-badge.pdf` — the shared renderer's five-page A4 sample; existing missing-cover/logo review notices are retained.

## Files changed for this request

New:

- `src/domain/headline.ts`
- `src/components/headline-controls.tsx`
- `src/magazine/headline.ts`
- `tests/headline-model.test.ts`
- `tests/headline-badge.spec.ts`
- `tests/click-navigation.spec.ts`
- `docs/editor-headline-badge-navigation.md`

Modified, preserving earlier uncommitted work:

- `src/domain/issue.ts`
- `src/components/issue-editor.tsx`
- `src/components/grid-editor.tsx`
- `src/components/preview.tsx`
- `src/components/preview-document.ts`
- `src/components/stories-panel.tsx`
- `src/app/studio.css`
- `src/magazine/document.ts`
- `src/magazine/pagination.ts`
- `src/magazine/grid-flow.ts`
- `src/magazine/styles.ts`
- `src/magazine/contrast.ts`
- `tests/background.spec.ts` — explicitly click the page when selecting an override target; browsing alone no longer selects it.

The PDF API/optimization code, local media architecture, fonts, section/story creation helpers and repository implementation were not changed in this request.
