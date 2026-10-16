# Background Design

Background Design sits below the canonical story metadata fields and above Page Builder. Its compact summary shows the selected page's effective design and whether it inherits the story or has a page override. Customize opens a nonmodal floating panel confined to Column 2; Close, Escape and clicking outside dismiss it.

## Settings and inheritance

Existing stories remain unchanged: both new schema fields are optional, and absent settings or `mode: "default"` leave the original master intact. Story `background` supports default, solid, two-colour directional gradient, or a local image over a base colour. Images support top/centre/bottom placement, 1–100% A4 height, crop/contain, horizontal/vertical focal point, opacity, directional fade, fade start/strength and fade-to colour. To blend an image edge seamlessly into its base, use a matching fade-to colour and 100% strength, fading down for a top image or up for a bottom image.

All actual pages generated for a story inherit its background. `pageBackgrounds` holds independent snapshots keyed by zero-based **story-relative page ordinal**, not physical PDF page or folio. Override this page targets the page currently selected in preview/fullscreen; it is disabled on front matter or another story. The same settings edit Story Background or Page Override with an explicit scope heading. Reset to Story Background deletes that ordinal's override. Changing story settings never rewrites overrides. Default mode can itself be a page override, restoring that page's original master even if the story has a custom background.

Overrides remain attached to the same story-relative ordinal when sections/stories move or front matter grows. They do not follow a paragraph if editing content causes it to reflow onto a different page. Overrides for temporarily absent ordinals are retained in saved data so shortening a story does not silently discard them.

## Rendering and media

One self-contained helper is serialized into the existing measured magazine document used by live preview, fullscreen and PDF export. Backgrounds are isolated full-page layers behind existing narrative, section identities, accents and furniture. They do not participate in content measurements, page creation, indexing or pagination. Explicit custom backgrounds replace the photographic opener's original decorative photo/fade/credit; original photo references remain saved, and choosing Default restores them. Existing paper/content panels and furniture retain their template fills and typography.

Local image selection/upload reuses MediaPicker and the existing IndexedDB media repository. Its optional decorative mode hides caption/credit/description editing only for this background use; other image editors retain their controls. Referenced background bytes join the existing self-contained preview/PDF transport. Missing/undecodable images block export through existing diagnostics; low resolution uses the existing 150 dpi notice. Assets remain local to the browser. No external storage, dependency or export-route change was added.

Limits are unchanged: PNG/JPEG/WebP up to 8 MB per local asset; the export request still has its existing **1 MB total limit**. Large photographs can therefore be saved locally yet require external optimization before PDF export. No silent image resizing is introduced.

## Verification and limits

Automated checks exercise old-data compatibility, validation, serialization and asset transport; story inheritance and newly generated continuations; independent ordinal overrides and reset; multiple stories and section ordering; upload, crop/focal point, opacity and directional fades; save/reload; fullscreen selection and PDF image embedding. Synthetic red image fixtures produce screenshots for top/centre/bottom placement in both directions and an eight-page A4 sample PDF. These are verification artwork, not new magazine assets.

The original sample's PDF is byte-identical to the pre-change renderer after normalizing only PDF date metadata (91,595 bytes). Visual checks compare synthetic image fades with the corresponding PDF raster. Text, accents and footer remain above the backgrounds. Print uses Chromium's RGB rendering; CMYK colour management, press bleed and printer-specific output are not implemented. Arbitrary photographs, Windows-local browsers and non-Chromium engines have not been visually verified. Contrast remains the editor's responsibility: existing heading and footer colours are deliberately preserved, even when a chosen background reduces their contrast.

Final validation:

- `npm run typecheck`, `npm run lint`, `npm test` (67 tests) and `npm run build` passed.
- 17 unique targeted browser tests passed across the final runs: background controls/render/export, blank-section regression, opening fields, basic grid and three-column workspace. The initial broad run had two hover-based fullscreen timeouts; rerunning the workspace suite after changing only test activation to focus + Enter passed all three workspace tests.
- Eight-page A4 sample: `test-results/background-design-sample.pdf`, 97,389 bytes, with embedded image XObjects.
- Six rendered fade screenshots: `test-results/background-{top,centre,bottom}-{down,up}.png`; panel screenshot: `test-results/background-design-panel.png`.
- PDF pages 3–8 rasterized at 96 dpi and compared against the six page screenshots: all 30 background pixel samples differed by at most one RGB channel level.
- Untouched legacy PDF comparison passed after normalizing date metadata only. This is a rendering comparison, not a claim that script/HTML bytes remain identical.

## Changed files

- `src/domain/background.ts` — validated settings and bounded story-page override keys.
- `src/domain/issue.ts` — optional backwards-compatible fields.
- `src/components/background-design.tsx` — compact summary and scoped floating controls.
- `src/components/issue-editor.tsx` — Column 2 placement and selected-page state.
- `src/components/media-picker.tsx` — opt-in decorative-image controls.
- `src/components/preview.tsx`, `src/components/preview-document.ts` — report selected story/page, with no preview redesign.
- `src/app/studio.css` — background-control styles scoped to Column 2.
- `src/magazine/background.ts` — shared DOM background renderer.
- `src/magazine/pagination.ts` — assign story-relative ordinals and apply backgrounds without adding/removing pages.
- `src/magazine/document.ts` — serialize the background helper.
- `src/magazine/styles.ts` — opt-in background layering only.
- `src/media/render.ts` — include referenced local background assets.
- `tests/background.test.ts`, `tests/background.spec.ts` — unit and browser/render/export regressions.
- `tests/workspace.spec.ts` — use keyboard fullscreen activation to avoid the hover-toolbar click timeout; resize, scrolling, ordering, thumbnails and navigation assertions remain intact.
- `docs/background-design.md` — implementation, verification and limitations.

No main merge, deployment or Supabase integration is part of this implementation.
