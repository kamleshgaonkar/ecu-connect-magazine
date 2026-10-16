# Compact backgrounds, print export, credits and contrast

Work remains on `feature/editor-ux-redesign`, based on `c0e50e501fbafb2af13e311e9bc9439d1d260804`. This release includes Background Design, PDF export, credits and contrast. ZIP archives and their storage/association architecture are postponed and excluded.

## Compact background controls

The card remains directly below Author. Customize opens a nonmodal floating panel confined to Column 2. Type choices are horizontal; image placement/fade direction and colours share paired rows. Coverage, opacity and fade start use compact sliders with visible percentages. The image appears as a small thumbnail with Change. Advanced contains crop/contain, focal point, fade strength and optional text protection. Close, Customize, Escape or clicking outside collapse the panel. All settings still use the existing story background and story-relative page override model.

## PDF transport and quality

The 1 MB rejection was application code in both Preview and `POST /api/export`, not a Next.js Route Handler or Chromium restriction. Export previously serialized base64 image strings into JSON, adding roughly one third to binary payload size. The preview size gate and API byte-count rejection are removed, as are the old per-render string/asset-count restrictions and the original-upload 8 MB cap. Existing image format and dimension validation remain.

The UI now sends issue JSON, image metadata and one binary file per referenced asset ID using multipart FormData. The API continues accepting legacy JSON callers. Binary files are optimized sequentially **before** conversion into the self-contained rendering transport, reducing temporary base64 duplication and bounding simultaneous native image decoding. An export only resolves referenced, enabled issue images, not the entire local library.

Sharp generates temporary print copies, conservatively preserving at least 300 dpi at full-A4 cover-crop scale, including landscape photographs cropped to portrait. It never upscales. JPEG uses quality 92 with 4:4:4 chroma; PNG/alpha stays lossless PNG. If a generated copy is larger than its original, the original is used. EXIF orientation is accounted for; magazine text remains native DOM/PDF text. Original filenames, metadata and binary files in IndexedDB are never rewritten by PDF optimization.

Referenced images travel once per asset ID. Optimized data is cached per original SHA-256 during an export, so identical legacy IDs can share the same encoded resource. Chromium may create necessary cropped variants, masks or rasterized decorative objects; object count is not identical to source-photo count. The high-resolution test has three colour JPEGs plus one cropped background reused across three pages (the same PDF object), and two existing grayscale cover/contents decorations.

Preview, fullscreen and PDF use the same templates, CSS, pagination, background, credit and contrast logic. Preview uses original pixels; PDF uses optimized render pixels, so lossy photograph pixels need not be identical. Typography, positioning, crops, gradients and fade rules remain shared. Chromium discovery, browser-path configuration, offline request blocking and server diagnostic logging from the existing export fix are retained.

Errors distinguish invalid data, incomplete/missing/undecodable images, layout/credit overflow and rendering timeouts. No replacement small request-size cap is introduced. Actual deployment proxies, memory, browser image limits and host execution budgets still apply. `maxDuration` is 300 seconds where supported, and the render-ready timeout is 120 seconds; these are not promises about a future hosting provider's limits. The Node multipart parser and self-contained renderer still consume memory proportional to the issue. Extremely large magazines may need per-section exports or a future queued/file-backed export service. No such backend/service is introduced here.

## Existing local images

Images remain in the existing IndexedDB assets store. Uploads preserve original bytes and use the existing local picker; no archive association store, migration, ZIP dependency or download controls are included. Opening the database without a fixed version supports both original v1 databases and development v2 databases without downgrading, deleting or rewriting their contents. Browser-local storage is not a permanent backup. ZIP/archive work is preserved outside the checkout for a later phase.

## Final-page credits

The existing Author field supplies the credit; no email is invented and no new email field is added. Enter `Name | Email` there. Existing name-only authors remain name-only. Display normalizes whitespace around pipes and has no “By” prefix. Original metadata remains unchanged. The existing author display override is retained and labelled Author credit override; blank overrides intentionally suppress the credit.

One credit is added to the last actual page generated for each included story, including single-page section openers. Opening headings no longer repeat it. Saved linked-author grid bindings are preserved but render a hidden marker: their resolved value supplies the same final credit, not a second copy. Manually written article content is not removed. Reflow moves the credit to the new final page automatically.

The credit uses bundled Poppins at the existing 8 pt credit/byline size, left-aligned at 15 mm and starting at 274 mm on the A4 page. Existing body regions end at 272 mm, keeping content and footer structures unchanged. A long credit remains visible; overlap/overflow diagnostics block PDF export rather than clipping or shrinking it. Tests verify the body/credit/footer separation and repagination.

## Text Contrast

Background Design includes Auto, Light, Dark and Original. These optional settings and text protection live in the existing background configuration, so story pages inherit them and complete page snapshots remain independent. Existing saved background settings **without** a contrast property retain Original appearance. New/explicitly edited custom backgrounds default to Auto. Original returns the template colours unchanged. The cover and contents retain their approved independent designs; contrast applies to story pages.

Auto samples a small background canvas under each text element's actual bounds. It accounts for image crop/focal point, coverage, opacity, gradients, directional fades, original photographic opener layers and opaque/translucent content panels. It retains a readable original colour; otherwise it chooses dark or light text. It covers headline, subheadline, article text and headings/lists/quotes, section ordinal/name, final credit, footer details and folio. The target is a 4.5:1 sampled text contrast ratio, rather than an average page colour.

Mixed photographic regions can defeat both flat colours. Default protection adds a local translucent backing only where needed, without changing text metrics. Advanced allows a subtle shadow or colour-only instead. Explicit Light/Dark forces the chosen text colour; protection can still help if enabled. A shadow alone cannot guarantee a contrast ratio. Yellow top/footer accents remain yellow when their sampled graphic contrast is adequate; otherwise a higher-contrast alternative is used. Fonts, type sizes, spacing, page sizes and body layout geometry are not redesigned.

This is finite spatial sampling, not a claim that every pixel of every possible image is certified accessible. Highly textured photos, thin glyphs, custom inline styles and unsampled local details still need visual review. Windows-local/non-Chromium engines, physical print, CMYK separations and press bleed are unverified/not introduced. RGB Chromium export is the verified path.

## Verification

- Typecheck, lint, all **73 unit tests** and production build passed.
- **32 targeted browser tests** passed in the final combined run: compact controls and inherited/page settings, local image upload/reload, credits, contrast, new section pages, canonical metadata/overrides, the basic grid and the approved three-column workspace. This is not a claim that every historical browser test for previously hidden editor controls was run.
- Local image tests verify compact controls, replacement without original-byte changes, and reload with both v1 and existing development-v2 databases. Archive features and tests are excluded.
- PDF tests exercise binary and legacy JSON input above 1 MB, quality/alpha/aspect ratio, original-byte preservation, visible-overflow errors and successful UI download above the removed cap.
- A five-page high-resolution stress magazine used three 4000×5000 JPEG raster fixtures. The PDF is **1,120,196 bytes**; extracted photographs have 2806×3508 pixels, and the cropped repeated background uses one shared PDF object. `pdftotext` confirms the heading, captions and final author/email remain extractable. These are deterministic synthetic image fixtures, not client photographs or approved magazine assets. Actual client photo collections were not available for visual verification.
- Visual screenshots were inspected for compact panel placement, final-page credit spacing and mixed-background contrast. Original image library/data fixtures and reference PDFs were not replaced with test assets.

Artifacts (ignored, regenerable): `test-results/background-design-panel.png`, `test-results/final-page-credit.png`, `test-results/contrast-gradient.png`, `test-results/contrast-photo.png`, `test-results/high-resolution-magazine.pdf`, `test-results/credits-sample.pdf`, `test-results/contrast-sample.pdf`.

## Changed files
- `docs/background-design.md`
- `docs/blank-section-pages.md`
- `docs/magazine-improvements.md`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `src/app/api/export/route.ts`
- `src/app/studio.css`
- `src/components/background-design.tsx`
- `src/components/grid-editor.tsx`
- `src/components/issue-editor.tsx`
- `src/components/media-picker.tsx`
- `src/components/preview.tsx`
- `src/domain/background.ts`
- `src/domain/issue.ts`
- `src/domain/media.ts`
- `src/export/pdf-images.ts`
- `src/magazine/contrast.ts`
- `src/magazine/document.ts`
- `src/magazine/grid-flow.ts`
- `src/magazine/pagination.ts`
- `src/magazine/styles.ts`
- `src/media/local.ts`
- `src/media/pdf-client.ts`
- `src/media/repository.ts`
- `tests/background.spec.ts`
- `tests/basic-grid.spec.ts`
- `tests/credits-contrast.spec.ts`
- `tests/image-library.spec.ts`
- `tests/opening-fields.spec.ts`
- `tests/page-layout-builder.spec.ts`
- `tests/pdf-images.test.ts`
- `tests/photo-export.spec.ts`
- `tests/visual-templates.spec.ts`
