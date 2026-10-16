# Automatic section opening pages

**Add section** creates one empty first story with an explicit `pagePair` setting. This legacy setting name is retained for compatibility; it now selects only the fixed Section Opening Page style. The paginator no longer appends an unconditional blank Continuation Page. The change applies to both new and previously saved marked stories without rewriting their data.

The supplied opening compositions remain unchanged:

- White Opening Page: gray ordinal, black section name and yellow top accent.
- What's Up Opening Page: black upper area, cream lower area, gray ordinal, two-line white section name and yellow accent.

Both styles carry the current volume/date footer and generated printed folio. Existing bundled fonts are retained, including the documented Bebas Neue numeral fallback. Page dimensions remain A4 portrait. Section ordinals follow included-section order; names and footer metadata come from the current issue. Actual pagination supplies contents references and page thumbnails, with contents pages grouped immediately after the cover.

New story fields, blocks and media start empty. No sample content or placeholders are inserted. Only explicitly marked stories use the special opening design; additional stories retain their regular page templates. No migration marks legacy stories or deletes saved layouts, media, blocks or stories. The removed continuation was a synthetic page with no content or grid rendering assigned to it, not a user-created page. Existing content-driven continuations and explicit grid page breaks retain their rendering paths.

## Linked Opening Page fields

Every story supports headline and subheadline on its Opening Page. The existing Author field now supplies a credit at the bottom-left of the final story page, above the footer; it does not repeat in the opening heading. Page Builder retains the display overrides (the author override is labelled Author credit override), initially following the source fields. Editing one stores only that field in optional `openingFields`; an empty string intentionally suppresses its text. “Use story …” removes that override and resumes synchronization. Original story fields remain unchanged, and Contents always indexes the original headline. Existing linked grid fields also resolve saved display overrides. Continuation pages do not gain automatic story headings.

The split opening places headline and subheadline in its cream lower area. The final-page credit uses the reserved gap above the footer, outside article content. Page furniture and blank body areas retain their design. Existing visible-overflow diagnostics block PDF export if fixed page content overflows. No three-column UI, stylesheet or PDF export route changes are part of the blank-continuation removal.

## Validation

Regression checks cover new sections, all seven opening styles, multiple stories, automatic folios and TOC references, fullscreen thumbnail counts, save/reload and A4 PDF export. Existing grid rendering tests cover real content continuations and explicit page breaks. Opening-field tests retain coverage for source synchronization, independent overrides, blank overrides, reset to source, original-headline indexing and persistence.

No merge, deployment, external storage or Supabase change is part of this work.

Removal validation: typecheck, lint, all 64 unit tests and production build passed. Twelve targeted browser checks passed across the final runs (11 together, followed by the corrected keyboard-driven thumbnail/export check). No saved data was removed, and no UI components, stylesheets or export API code changed.
