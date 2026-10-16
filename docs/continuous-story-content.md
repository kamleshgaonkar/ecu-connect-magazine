# Continuous Story Content editor

Implemented on `feature/editor-ux-redesign`, based on commit `8038d6660b53173721d95380561c86965f9344ba`. Continuous Story Content and the photographic section identity fix are packaged together for the approved feature-branch commit and push. No merge, deployment, cloud storage or ZIP implementation is included.

## One document and an additive model

Column 2 now has one Story Content surface below Background Design and above the existing Page Builder. It edits the existing `story.blocks`, retaining block IDs and all separate headline/subheadline/badge/author metadata. There is no second HTML body blob or backend. Optional structured `rich` data carries bold, italic, underline, safe links, alignment, heading level and list items. Existing `text` remains the compatible plain-text projection used for counts and legacy controls. Optional `component` data carries the editorial node's structured fields; the existing `block.image` reference carries its image. No image bytes are stored in issue JSON.

Legacy stories are not rewritten on open. The first actual body edit opts the story into `contentMode: continuous`; metadata edits alone do not. Existing schema-version-2 records remain readable with absent new fields. New content continues to use the existing IssueRepository and local IndexedDB image repository. Story/section creation helpers, metadata controls and Page Builder structures are unchanged.

The editor uses native contentEditable with a compact toolbar and safe DOM-to-JSON normalization. Echoed input does not reset the caret. Application body undo/redo preserves canonical metadata and later manual grid changes; surviving cell bindings are recovered without restoring an obsolete layout. Controls are native buttons/selects, with accessible names, keyboard component selection and move-up/down alternatives.

## Word, Excel and formatting

HTML paste is rebuilt from an allow-list; raw pasted HTML is never stored or injected into the magazine. Supported content includes paragraphs, semantic headings, bold/italic/underline, alignment, ordered/unordered lists, hyperlinks, email links, Word list paragraphs, common manual page-break markers and tables. Plain tab-separated Excel data becomes a table. Script/embedded objects, event handlers, arbitrary fonts, sizing, positioning and Word-specific styles are discarded. Pasted remote/embedded images are not fetched or silently substituted: a visible notice asks for an original upload through + Insert. Plain URLs/email addresses are linkified in the structured content.

Merged cells are flattened with an explicit warning. Nested tables are flattened inside the parent cell with a warning. All retained cell text remains editable, but complex Word layout fidelity is not claimed. Word headers/footers, tracked changes, comments, drawings, equations and nested-list indentation are not implemented as Word document features. This is clipboard content import, not `.docx` file import or an Office layout engine. Actual Windows Word/Excel clipboard applications have not been exercised here; browser tests use representative Word HTML and tab-separated fixtures.

Import bounds are explicit: 1,000 blocks per story, 500 rows and 12 columns per table, and 200,000 characters per block. An oversized paste is rejected with a visible explanation before anything is inserted or removed; split a larger source into smaller parts. These are data-validation bounds, not pagination word counts. Font choice and arbitrary Word font sizes intentionally follow the existing magazine typography. Italics use the existing browser/font synthesis where a separate italic font face is not bundled.

## Measured pagination and saved designs

The shared browser renderer measures actual DOM using loaded fonts and the page master's real body area. Continuous content starts beneath the opening metadata, including the special first-story section opening, and proceeds through the existing continuation masters. Manual page breaks are content markers. Paragraph splitting retains inline marks, links, alignment and text; list continuations retain numbering. Headings probe space for their following paragraph's opening lines where possible. Page counts, folios, contents references and final-page author credits use the existing final pagination pass.

Inline image plus caption, employee portrait/nameplate, quote, CTA and information components stay atomic. If there is insufficient remaining space they move to the next body region/page. A component or a single table row too large for a usable region is retained visibly with an actionable warning and blocked PDF export. It is never silently shrunk, clipped, truncated or discarded. Tables split by complete rows, with repeated headers.

Existing linked/flowing Page Builder cells receive formatted content and table continuations through the same content renderer. Independent manual grid blocks/rows and their saved properties are retained. **Explicitly assigned content and hard fixed cells retain their manual placement constraints.** An assigned oversized block warns and blocks export; this implementation does not convert all old fixed assignments into an unrestricted fluid layout. Widen/resize the relevant cell or revise its placement in Page Builder. Automatically rewriting those assignments would risk changing user-designed pages and is deliberately avoided.

Story backgrounds remain inherited, and existing per-page background overrides remain unchanged. In continuous mode, explicit overridden page ordinals are reserved even if shortening the story would otherwise remove them. Authored continuation-grid content likewise keeps a continuation when needed. These deliberately retained custom pages can be empty of flowing article text. Blank automatically generated continuations are not added to untouched/new sections. The existing story-relative ordinal model remains; persistent page UUIDs/content anchors are not introduced.

## Inserted components

A single + Insert menu offers Image, Table, Employee Profile, Quote / Testimonial, CTA Box, Information Box, Page break and Paragraph. Insertion is at the boundary after the current paragraph/component, or at the end when there is no active boundary. Selecting a component exposes only its contextual settings in a bounded panel within Column 2.

- **Images:** upload/select existing local originals; full text width initially; width/height, cover/contain, focal point, caption and optional attribution/description. Original bytes remain untouched. Inline images use separate references from page backgrounds.
- **Tables:** add/remove rows and columns, header toggle, cell formatting/alignment/links, cell/table backgrounds and borders. Cell and row IDs survive edits. Destructive row/column removal requires confirmation. Tables retain complete rows and repeat their header across pages.
- **Employee Profile:** portrait with a yellow (editable-colour) nameplate, person name, designation and optional company/location. The combined portrait/nameplate floats left so the following story prose wraps beside it and resumes full width below. Multiple profiles are supported.
- **Executive Quote:** white rounded horizontal panel, yellow opening quote mark, blue quote, name/role/company below, right cutout portrait with overlapping yellow/blue circles behind. The panel follows the reference's approximately 3.05:1 composition when content allows; narrow/long content can require more height or trigger an overflow warning.
- **Compact Quote:** white rounded horizontal panel, circular portrait at left, yellow quote mark, blue quotation, attribution below. Both quote presets use one data record, so switching preserves quote/attribution/image/focal data. The preset changes the default image fit appropriately; users retain crop/focal controls. Width resizing preserves the relative composition without silently shrinking text. The executive preset needs an approved transparent cutout: an opaque photograph remains opaque, and no background-removal service is introduced.
- **CTA:** heading, formatted description, safe clickable link, colours/radius and ECU yellow preset.
- **Information Box:** heading, formatted content/links, background, border, spacing and radius for contact/address/announcement content.

Components use stable block IDs and HTML drag-and-drop between paragraphs. A drop indicator shows the target boundary. Move up/down buttons provide alternatives. Reorder preserves the full record, styling and asset reference. Broad text deletion retains nontext components with a notice; component removal is explicit, confirmed and undoable. Original uploaded assets are not deleted when a component is removed.

## Rendering, links and visual comparison

`createContentRenderer`, content CSS and measured flow are shared by editor node views, live magazine preview, fullscreen and Chromium PDF. Component text remains native selectable PDF text; image references pass through the already approved print-quality export path. HTTP(S), mailto and tel links are allowed; unsafe protocols are rejected. Preview links open a separate browsing context instead of replacing the preview document. Merely browsing, scrolling or navigating fullscreen still never changes editor selection.

The two supplied quote references were accessible and used for visual comparison. The implemented presets preserve their portrait side, rounded white panel, blue text, yellow quote glyph and executive blue/yellow circles. No additional quote preset was created. Card screenshots were inspected against those compositions. The verification images use a simple transparent geometric portrait fixture, **not an ECU employee or a substitute approved brand asset**. Exact likeness, original asset cropping, glyph shape, client-photo masking and pixel-identical licensed-font rendering are not claimed. Approved portraits must be uploaded locally. No PDF-embedded font was extracted.

The sample A4 PDF is generated from the same document/pagination code; browser assertions compare its page count and verify link annotations. The current sample is five A4 pages, 112,838 bytes, marked SAMPLE / NOT APPROVED. PDF inspection confirms embedded 700×1000 portrait pixels/alpha masks, native extractable text and links. A full opening-page screenshot was visually compared with the rasterized PDF page: card geometry, profile wrapping, heading and footer align within normal raster rounding. RGB Chromium is verified; physical print/CMYK/bleed and Windows/non-Chromium clipboard/rendering remain unverified. Native contentEditable formatting uses the browser's current editing commands; cross-browser parity and complex Office document features need further validation before claiming Word-equivalent editing.

## Checks and review artifacts

Stages were checked incrementally: rich model/paste, text flow, inline images, tables/components, then drag/reorder. Typecheck, lint, **77 unit tests**, production build and the **42-test targeted Chromium regression selection** passed, including the existing backgrounds, headline/badge, click navigation, credits/contrast, grids, images and PDF tests. A final 12-test feature run verifies the latest table-removal, undo/redo, paste-limit and Word-break and Word list-numbering assertions. This is not a claim that every historical browser test for hidden legacy controls was run.

New coverage checks formatting/sanitization and persistence; measured opening/continuation flow; manual breaks; final credits; reserved overrides; original image bytes; captions and oversized components; tables with repeated headers in normal pages/grids; both quote presets; profile text wrapping; CTA/info links; editor preset/settings changes; drag, accessible moves, delete protection and body undo; list numbering; fullscreen and PDF page/link consistency.

Ignored, regenerable artifacts:

- `test-results/continuous-story-editor.png`
- `test-results/continuous-opening.png`
- `test-results/compact-quote.png`
- `test-results/executive-quote.png`
- `test-results/continuous-editorial.pdf`

## Changed files

New:

- `src/domain/content.ts`
- `src/content/word-paste.ts`
- `src/content/text-dom.ts`
- `src/content/render.ts`
- `src/content/flow.ts`
- `src/content/styles.ts`
- `src/content/history.ts`
- `src/components/story-content.tsx`
- `src/components/rich-text-input.tsx`
- `src/components/editorial-component-settings.tsx`
- `tests/story-content-model.test.ts`
- `tests/story-content.spec.ts`
- `tests/editorial-content.spec.ts`
- `tests/photographic-identity.spec.ts`
- `docs/continuous-story-content.md`

Modified:

- `src/domain/issue.ts`
- `src/components/issue-editor.tsx`
- `src/components/preview.tsx`
- `src/app/studio.css`
- `src/magazine/grid-flow.ts`
- `src/magazine/document.ts`
- `src/magazine/pagination.ts`
- `src/magazine/styles.ts`
- `src/magazine/contrast.ts`

No dependency, media-storage architecture, PDF export route, dashboard or section/story creation helper changes were made.

## Photographic section identity regression fix

Text Contrast's backing treatment previously painted black rectangles behind the large section number and name on photographic section openings. The shared renderer now identifies an actual visible photograph covering the section number and applies a scoped transparent white identity overlay. The name sits below the number within an 85 mm width and 15 mm left margin; a subtle text shadow supports legibility without a rectangular panel. Original photographic masters and section openings using uploaded background images share this treatment, including Original contrast mode. Missing-photo and non-photographic masters retain their existing behaviour. Headline/subheadline geometry, body content, backgrounds, badges, furniture and pagination are unchanged.

`tests/photographic-identity.spec.ts` covers both photographic paths, transparent identity, bounded placement, unchanged body geometry, non-photographic contrast behaviour and successful PDF export through the shared document pipeline. A synthetic light image is used for regression checks; no approved ECU photography is substituted or claimed.

## Final pre-commit validation

The combined change passed `npm run typecheck`, `npm run lint`, all **77 unit tests** across 15 files, `npm run build`, and a final **46-test targeted Chromium regression run**. The browser selection includes both new content suites, photographic identity, backgrounds, basic grids, blank sections, click navigation, credits/contrast, headline/badge, image-library compatibility, opening fields, large-image PDF export and workspace behaviour. PDF requests exercised the production export endpoint. Five historical tests targeting older image/template controls were excluded by the existing selection; this is not a full historical browser-suite pass. No generated screenshots, PDFs, build output or temporary test artifacts are included in the commit.
