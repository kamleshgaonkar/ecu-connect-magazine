# ECU Connect original magazine design system

Phase 2 design analysis, 14 October 2026. **Analysis and proposed specification only; no application design changes are implemented.** See [template inventory and implementation proposal](template-inventory.md).

## Sources and review method

All four requested PDFs were verified on GitHub `main` at commit `7117caabeecbf930584ffa20cf4980362197ded2`, fetched through the existing repository authentication, read as PDF bytes, and opened successfully without passwords. The cloud working tree had not yet synced `/references`; the remote files were read into `/tmp/ecu-original-analysis` without merging, resetting, or replacing the existing builder.

| Source in `/references`                                                                                                                                                                          | Pages |        File size | Cover edition date | Original production metadata                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----: | ---------------: | ------------------ | -------------------------------------------- |
| [ECU Connect - Vol 15 (2026).pdf](https://github.com/kamleshgaonkar/ecu-connect-magazine/blob/7117caabeecbf930584ffa20cf4980362197ded2/references/ECU%20Connect%20-%20Vol%2015%20%282026%29.pdf) |    29 | 13,776,058 bytes | July 20, 2026      | Adobe InDesign 21.2 / Adobe PDF Library 18.0 |
| [ECU Connect - Vol 17 (2026).pdf](https://github.com/kamleshgaonkar/ecu-connect-magazine/blob/7117caabeecbf930584ffa20cf4980362197ded2/references/ECU%20Connect%20-%20Vol%2017%20%282026%29.pdf) |    24 |  7,900,228 bytes | August 17, 2026    | Same                                         |
| [ECU Connect - Vol 19 (2026).pdf](https://github.com/kamleshgaonkar/ecu-connect-magazine/blob/7117caabeecbf930584ffa20cf4980362197ded2/references/ECU%20Connect%20-%20Vol%2019%20%282026%29.pdf) |    22 | 14,941,312 bytes | September 15, 2026 | Same                                         |
| [ECU Connect - Vol 20 (2026).pdf](https://github.com/kamleshgaonkar/ecu-connect-magazine/blob/7117caabeecbf930584ffa20cf4980362197ded2/references/ECU%20Connect%20-%20Vol%2020%20%282026%29.pdf) |    20 |  9,151,446 bytes | September 28, 2026 | Same                                         |

**Visual coverage: 95 of 95 pages.** Every page was rasterized at 1.7 pixels per PDF point (122.4 dpi), then inspected individually within labeled four-page sheets. Separate full-page views examined cover/contents, portrait quotes and cards, two-column composition, security infographic, chart/caption, rate table, both culture-code pages, holiday table, and back page. Extracted text, embedded font names, span positions, drawing geometry/colours, and image rectangles supported the visual review; they did not replace it. A page-by-page visual ledger is in the inventory.

Citation convention: `V20 PDF p16 / folio 14` distinguishes physical PDF pages from visible printed numbers. Measurements use PDF points, with `1 pt = 0.352778 mm`; CSS equivalents use `1 pt = 1.333333 px` at 96 dpi. PDF text bounding boxes include font ascent/descent and are not exact visible glyph bounds.

Confidence labels below distinguish **measured** PDF values, **observed** visual patterns, and **proposed** implementation choices. This is a reconstruction specification from four published editions, not an official corporate brand manual. Supplied reference content is historical evidence, not new approved copy for Volume 21.

## 1. Page geometry and grids

All 95 pages have identical MediaBox, CropBox, TrimBox and BleedBox: approximately **595.276 × 841.890 pt = 210 × 297 mm**, portrait A4. No additional bleed area or crop marks are represented by these files. Full-bleed imagery reaches the digital page edge; that does not establish a commercial print bleed specification.

| Element                          | Measured / observed geometry                                                                                                                                                           | Evidence                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Common live content frame        | Left `x=42.52 pt` (15 mm); right about `x=552.76–553.35 pt` (195–195.21 mm). Width about 510.24 pt (180 mm).                                                                           | V15 p4, p9; V19 p5; V20 p4, p16                  |
| Full-page background             | Extends to all four A4 edges; photography, flat fills and gradients can share the page.                                                                                                | All covers; V15 p3; V17 p6; notices and holidays |
| Continuation header region       | Section label near the upper-left, often text bbox `y≈11.75 pt`; two-line What's Up label ends near `y≈62.42 pt`. Typical content starts around `y=70.87 pt` (25 mm), with exceptions. | V15 p9; V17 p14; V20 p4                          |
| Top yellow tab                   | `x≈38.268–178.879 pt` (13.5–63.1 mm), touches top edge. Height 6.4 pt on representative continuation pages and 8.4 pt on representative openers (about 2.26 / 2.96 mm).                | V15 p3–4                                         |
| Typical lower live-content limit | Many inset image/paper frames end at `y≈771.02 pt` (272 mm). This is a common safe boundary, not a rule that fills every page.                                                         | V15 p3, p9; V17 p14                              |
| Footer / folio band              | Folio text bbox near `y=800.93–819.79 pt`; issue-label bbox near `y=804.54–818.01 pt`. Right folio edge about `x=553.35 pt`.                                                           | V15 p3–28; V20 p16                               |
| Footer yellow stroke             | Visible from left page edge to `x≈35.575 pt` (12.55 mm); height ≈1.417 pt (0.5 mm), at `y≈809.648 pt` (285.63 mm).                                                                     | V15 p3–4, p27                                    |
| White / translucent paper card   | Outer bounds usually aligned to the 15 mm frame. Rounded corners; content inset varies, commonly about 10–15 mm.                                                                       | V15 p9–13; V17 p7–10; V20 p16                    |
| Contents grid                    | Two columns: left begins at `x=42.52 pt`, right about `x=311.01 pt` (109.72 mm); usable columns roughly 85 mm wide with roughly 10 mm central gap.                                     | All four PDF p2                                  |

The grid is **modular and template-specific**, not a universal equal-column newspaper grid:

- Full-width prose and full-width photos alternate throughout feature continuations.
- Text/portrait or text/photo splits are often asymmetric. V19 p3 has narrative at left and an office photo at right; V20 p6 alternates a left portrait with a right portrait further down.
- Two-column text is explicit in V17 p12; a full-width table follows those columns. V19 p5 uses two top customer/logo columns with a thin blue divider, then a separate profile region.
- Photo galleries use equal or asymmetric two-column rows, full-width rows, or three-column strips. They are arranged editorially, rather than flowed as ordinary paragraphs.
- Three framework cards appear in V15 p4. These are a dedicated three-card composition, not evidence that all pages use three columns.
- The ECU Worldwide Way uses a central blue axis with alternating content on each side across two pages. Its offsets do not match the contents grid.

**Proposed base geometry:** a 210 × 297 mm page shell with a 15 mm live-content frame, separate top-tab/header and footer layers, and template-specific content regions. Keep dedicated exceptions for cover, contents, culture code, holidays and back page. Do not apply a fixed 18 mm padded white page to every template.

## 2. Typography

### Positively identified typefaces

| Role                                 | PDF font evidence                                                                                      | Usage                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Cover masthead `ECU CONNECT`         | **Impact**, 104 pt                                                                                     | All four covers; heavy condensed uppercase, blue                                            |
| Contents display word                | **BebasNeue**, 150 pt in V15 p2                                                                        | Huge white condensed `CONTENTS`; size/position varies slightly by edition                   |
| Contents folio numbers               | **BebasNeueBold**, 45 pt in V15 p2                                                                     | Large blue numbers preceding section labels                                                 |
| Main opener ordinal `01`, `02`, `03` | **BebasNeueBold**, 172.17 pt                                                                           | Oversized translucent white number over the hero area                                       |
| Holiday ordinal `04`                 | **BebasNeueBold**, 95.11 pt                                                                            | Yellow number beside white holiday heading                                                  |
| Editorial text system                | **Poppins Regular, Medium, SemiBold, Bold, Light, Italic, SemiBoldItalic, Black**                      | Body, headings, quotes, bylines, captions, culture code and footer                          |
| Supporting / placed-asset type       | Archivo Regular/SemiBold/Bold, ArialMT/BoldMT, HelveticaNeueLTPro-Roman, Renogare-Regular, FontAwesome | Credits, quotation glyphs, bullets/icons, logo or placed artwork details                    |
| Contact-document exception           | Aptos Narrow / Bold and Amasis MT Pro Bold                                                             | V17 p14 air-freight contact sheet; Amasis title is not the magazine's primary headline face |

Some logo/display text is outlined artwork or embedded in images, so absent font names do not mean a missing design element. The large `WAY` wordmark should be matched from an approved asset rather than guessed from the surrounding Poppins text.

### Hierarchy and spacing

| Level                          | Observed PDF size / style                                                    | CSS equivalent or implication                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Cover main story               | Poppins Bold; 40 pt in V15, smaller mult-line variants in other issues       | Template-dependent title style; no automatic fitting by shrinking                                   |
| Very large feature title       | V15 p3: Poppins Bold 55.5 pt                                                 | 74 px; deliberate exceptional title treatment                                                       |
| Typical article / notice title | Poppins Bold; commonly 21–32 pt, with 18–30 pt variants                      | About 28–42.7 px; selected preset, not one global size                                              |
| Section continuation label     | Poppins Medium, about 18.62–19 pt, uppercase                                 | About 24.8–25.3 px; one or two lines                                                                |
| Standfirst / subtitle          | Poppins Regular or Italic, commonly 16–22 pt; varies with composition        | Blue on light themes, white on dark themes                                                          |
| Body / subhead                 | Poppins Regular 9 pt; inline and subhead SemiBold at 9 pt                    | 12 px; measured repeated body baseline separation is 12 pt (16 px), approximately 1.333 line height |
| Portrait quotation             | Poppins, often 9 pt, with 13 pt in V15 p4                                    | 12 / 17.3 px; quote style depends on card size                                                      |
| Table body                     | Usually Poppins Regular 9 pt; contact sheet has denser specialist typography | Wrap cells and paginate rows rather than shrink to fit                                              |
| Table header                   | Often Poppins SemiBold 11 pt; compact rate-table variants use 9 pt           | 14.7 / 12 px                                                                                        |
| Captions / contact credits     | Commonly 8–10 pt; portrait role lines often italic                           | Explicit content and presentation fields                                                            |
| Issue footer / printed folio   | Poppins SemiBold 8 pt / Poppins Bold 11 pt                                   | 10.7 / 14.7 px                                                                                      |
| Back-page contribution card    | Poppins Regular / SemiBold 12 pt                                             | 16 px; emphasis on deadline                                                                         |

Body paragraphs are largely flush-left, with selective bold emphasis, inline blue/yellow emphasis, italic subtitles, underlined links and chevron bullets. Paragraph gaps are commonly about one extra body line, but vary inside cards. Do not substitute serif Georgia headlines or assume the original uses large contemporary web body text.

**Font availability:** these names are verified from embedded PDF fonts. Usable web/desktop font files and their embedding licenses were not supplied as repository assets. Before implementation, obtain approved Impact/Bebas/Poppins files or explicitly approve substitutions. Do not treat embedded PDF subsets as a ready-to-use font distribution. Exact tracking, optical adjustments and outlined wordmarks still need visual comparison after font loading.

## 3. Colours and surfaces

The recurring identity is **ECU blue + yellow**, with white/charcoal text and issue/story-specific supporting palettes. Values below come from PDF text colours or vector fills; photographs, gradients, transparency and PDF colour conversion may produce different visible pixel values.

| Token / role                  | Observed value                                 | Confidence / source                                                                                                  |
| ----------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Primary ECU blue              | `#034EA2`                                      | Measured recurring masthead, section labels and text; all volumes                                                    |
| Close editorial blue variants | `#054F9E`, `#034FA1`                           | Measured article headings / quote details; preserve as observed variants until a brand master confirms consolidation |
| Primary yellow                | `#FFDD00`                                      | Measured text and rounded vector fill `(1, .867, 0)`; contents backgrounds, tabs, callouts, ribbons                  |
| Main dark body ink            | `#1E1E1E`, occasionally `#000000`              | Measured prose / tables                                                                                              |
| Culture-code grey             | `#58595B`                                      | Measured recurring culture text / heading                                                                            |
| Dark feature background       | Approximately `#151C22`                        | Vector fill `(0.082, .110, .133)` in V15 p3–7; rendered colour varies slightly                                       |
| White paper / reversed text   | `#FFFFFF`                                      | Measured                                                                                                             |
| Light table stripe            | Approximately `#E6EDF6` / very pale blue-white | Representative vector fills around `(.902, .931, .962)`; opacity differs by table                                    |
| Culture intro panel           | Approximately `#F1F1F2`                        | Representative vector fill `(.945, .947, .949)`                                                                      |

Observed theme examples: V15 special feature cream (`~#FAEBCC` base); V15 galleries warm peach gradients; V17 cover pale green (`~#F4F9EC` base), maritime story dark brown (`~#282320` base), air-freight pages pale blue (`~#D3E2F9` base); V19 anniversary lavender (`~#DCD2FF` base); V20 cover pale blue-white (`~#F0F7FA` base), chairman announcement cream (`~#FBF1DD` base), Mexico mint and Saudi sage. These are **measured base fills / approximate theme colours**, not authoritative flat colours for every pixel.

Paper panels can be opaque white or translucent white over destination photography. Shadows occur on the cover logo plaque and dashboard callout cards; ordinary paper panels usually rely on corner rounding and contrast. Yellow bars underline headings. Black/charcoal pill labels identify `Special Feature`, `Important Advisory`, or `Organizational Announcement`. Yellow portrait ribbons and contact strips are a recurring component.

## 4. Cover and contents

### Cover master

All covers share a white rounded ECU Worldwide logo plaque hanging from the upper-right edge with a drop shadow; a large blue Impact masthead; a two-part yellow/blue **FORTNIGHTLY EDITION / volume + date** ribbon with angled ends; a centred blue Poppins story headline; a yellow underline; and a large thematic photo extending to the lower page edges. The cover has no printed folio.

V15 adds a standfirst and large All About U campaign graphic over the port/ship imagery. V17 uses an AI/capacity visual with a white-to-dark blue transition. V19 uses the Nanjing architectural photograph and a blue-sky field. V20 uses AI/dashboard imagery and a white upper field. Image scale, title wrapping and transitions are explicit cover variants; the generic green orbital artwork in the builder is unrelated to these covers.

### Contents master

Every PDF p2 is a saturated yellow page with white `Table of` and a very large white condensed `CONTENTS`, a subtle shadow, and a thin divider below. Two columns contain large blue **starting folios**, uppercase blue section labels, black article bullets, optional italic descriptions, dark category pills and selected rounded thumbnails. It is grouped by editorial section rather than one uniform row for every story.

The reference folios are section start pages: V15 `01 / 06 / 20 / 23 / 25`; V17 `01 / 03 / 04 / 16 / 18 / 20` (including Leadership Perspectives); V19 `01 / 04 / 10 / 16 / 18`; V20 `01 / 06 / 14 / 15 / 17`. These map to actual article pagination. Thumbnail/editorial selection is manual: for example, V15 includes a team photo beneath the holidays group, while V19 uses a beach image. Do not infer that every thumbnail must depict the adjoining headline.

**Proposed behaviour:** compute folios from final pagination, group configurable story summaries under sections, and allow explicit thumbnail choices. If contents grows beyond one page, continue its template without reducing font size; recompute the front-matter count before finalizing article folios. The four originals themselves each have one contents page.

## 5. Section starts, articles and continuation pages

Major openers use large translucent ordinals: `01 Cover Story`, `02 What's Up @ ECU Worldwide`, `03 Notice Board`; holidays use a yellow `04`. These numbers are **section markers, not page numbers**. The culture-code spread and V17 Leadership Perspectives have their own headings without this large numbered-opener convention. Source ordinals do not simply enumerate every contents group.

Continuation pages generally repeat the small section heading and top yellow tab, keep the article's palette, and omit the giant ordinal and repeated main article title. New articles within the same section can start with a fresh main title, image or category pill. V15 p21 is a photo-gallery continuation with no visible top section label; treat it as an observed exception, not an omission to reproduce everywhere.

Story compositions include full-width prose, prose beside rounded portraits/photos, paper-panel transcripts with oversized opening/closing quotation marks, portrait testimonial strips, galleries with local captions, and bottom photographic fades. V20 p6–7 illustrates a new article continuing under the **Cover Story** heading; V17 p11–15 illustrates a five-page air-freight article whose successive layouts include hero/quote, columns/table, photos, a contact document and a wide table.

There is no visual basis for a universal `story title · continued` line or a compulsory fresh page for every content block. Proposed pagination must choose an opener once, then appropriate continuation templates with the correct repeated section masthead and article theme. Keep all text visible; use authored page-break hints only as optional constrained editorial controls.

## 6. Images, captions, tables and infographics

- Hero images are full-bleed or full-width and can fade into a coloured background. Preserve explicit crop/focal-point settings; an uncontrolled `object-fit: cover` can cut off people, text or skyline landmarks.
- Inline editorial photography is commonly rounded. Galleries combine wide landscape, paired portrait, two-column landscape and three-column strips (V15 p18–21; V19 p8–9; V20 p13–15).
- Portraits may be cutouts on white quote cards with blue/yellow abstract blobs, circular thumbnails, or rectangular profiles with yellow name-and-role ribbons. These are separate treatments, not one generic avatar.
- Captions appear as coloured image-edge ribbons, name/role labels, an italic figure caption, or a contributor/email credit above the footer. V20 p4 has an explicit `Figure 1` caption. Caption/credit must remain associated with its image or article.
- Tables include blue header/striped-body regulatory tables; pale ruled trade-partner grids; a wide six-column infrastructure table; a dense air-freight contact sheet; a Canada rate table with grouped blue/yellow headings; and three-column holiday tables with grouped/merged date cells. See V17 p12, p14–15; V19 p12–13, p17; V20 p16, p19.
- Infographics include V15 p4's three icon framework cards, V19 p4's Nanjing coverage map, V17 p19's two-column security graphic, and V20 p4's multi-series line chart. Some are placed image/composite artwork: the chart is a raster image with an editable PDF caption; the security graphic includes a large placed image; the V17 p14 contact sheet contains live specialist-font text and vector table detail. Do not classify all artwork as either a flat image or editable data solely from text extraction.
- QR codes and social icons recur on the back page in the order Facebook, YouTube, X, LinkedIn. Their destinations were not decoded or validated in this phase. Apparent links in the PDFs do not automatically prove working link annotations: inspected representative pages reported zero annotations.

**Proposed content support:** validated local asset references, alt text, caption/credit, image presentation and focal point; portrait/quote blocks; constrained gallery layouts; semantic tables with column widths, grouped headers and row groups; figure/map/infographic assets with captions and optional actual source data. Do not invent chart data, contact details, holiday dates, social destinations or new announcements. Keep original aspect ratios for text-bearing charts/screenshots and show resolution warnings.

## 7. Recurring page furniture and special pages

Ordinary article pages carry the top yellow tab and section masthead, then a lower-left short yellow rule followed by **ECU CONNECT + volume + edition date**, with a bold folio at lower right. Text reverses to white on dark/photo pages and is black on light pages. There is no generic running `ECU Connect / Volume N` top rule spanning all page types.

The ECU Worldwide Way is a nearly identical two-page recurring composition in all four editions: logo upper-left; pale-grey upper-right intro panel; large blue `WAY`; blue vertical arrow/axis; alternating principles connected by grey lines and dots; yellow axis numbers 1–7; concluding light-weight blue text; yellow branching arrows at the bottom of the second page. It has a special page master instead of the ordinary top section masthead. Changes in folio/date are expected; changes in approved culture copy require separate editorial direction.

Holiday openers use the same beach/palm background, yellow `04` with a diagonal separator, large white heading, blue table header and translucent alternating rows. Continuations use a smaller white heading with a yellow vertical stroke and repeat the table header. V15, V17 and V19 use two holiday pages; V20 uses one. Date groups can span multiple countries and lines; repeat/split such groups explicitly when pagination changes.

All editions end with a contribution page: fibre-optic blue/purple background, centred rounded yellow deadline/submission card, then a white lower strip with social prompt, four icons and QR codes. Deadline values change by issue and are historical, not reusable defaults for a future edition. V15 visibly prints folio 27 here; V17, V19 and V20 do not visibly print a back-page folio. Cover and contents are unnumbered in all four. Proposed folio configuration needs an explicit back-page visibility exception.

## 8. Existing builder differences and retained capabilities

Inspected the current domain, renderer, preview, editor, dashboard, repository adapter, export route and existing workflow tests. The current 9-page sample PDF is a functional editorial proof, not a reproduction of these designs.

| Area              | Existing implementation                                                        | Original / required direction                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page size         | A4, correctly set for preview/PDF                                              | Retain A4; change masters and live-content geometry                                                                                                                                     |
| Identity          | Green magazine cover, orbital line art, faux text brand; Arial / Georgia       | Blue/yellow ECU artwork; Impact/Bebas/Poppins; photograph-led covers                                                                                                                    |
| Grid              | `.page` padding 18/18/17 mm; one 241 mm body region                            | About 15 mm side frame; template-specific hero, card, columns, gallery and footer zones                                                                                                 |
| Cover data        | Issue title/date, no image, edition ribbon or real logo                        | Cover image/crop, official plaque, ribbon, cover headline/standfirst, optional campaign asset                                                                                           |
| Contents          | White `In this issue`; one row per story                                       | Yellow two-column section groups, selected photos, categories and summaries                                                                                                             |
| Numbering         | Cover counts as 1; first article is 3; tests assert `03`                       | Separate physical page index, printed folio, section ordinal and folio visibility; first article usually folio 1                                                                        |
| Head/foot         | Generic top running header and ruled footer on every ordinary page             | Section-specific tab/header, issue/date footer stroke, special masters and contrast variants                                                                                            |
| Templates         | `feature`, `dispatch`, `bulletin`; mostly headline-size / separator variants   | Dedicated constrained patterns in the inventory; per-story theme and continuations                                                                                                      |
| Blocks            | Paragraph, heading, quote, line-based list; bold/italic text marks             | Preserve these; add explicit media, profile, testimonial, gallery, callout, figure and table schemas                                                                                    |
| Content structure | Every story starts a fresh generic page; no image/asset fields                 | Editorial opener/continuation selection, nested categories, meaningful keep-together rules                                                                                              |
| Sections          | Seven named presets, rename/enable/order supported                             | Preserve all; add optional Leadership Perspectives. Special Feature is a category in V15, not a proven standalone section master. Nanjing new office appears within Cover Story in V19. |
| Assets / export   | Self-contained HTML; route aborts all external requests; no image/font loading | Embed approved local assets or resolve them through a controlled asset layer before rendering; wait for decoded images and exact fonts                                                  |
| Persistence       | `IssueRepository` with localStorage adapter and strict Zod validation          | Retain interface/local workflow; versioned additive schema migration so older saved issues remain readable                                                                              |
| Overflow          | Measured text splitting, warning display, PDF rejects unresolved overflow      | Retain policy; extend measurement to grouped media, columns, tables and fixed special masters                                                                                           |
| Dashboard covers  | Separate generic cover artwork in `dashboard.tsx` / global CSS                 | Later use the same cover definition for thumbnail and full magazine; a complete workspace UI reskin is not needed for output fidelity                                                   |

## 9. Open fidelity questions

The sources establish the designs but do not provide the InDesign masters, official brand specifications, full-resolution asset library or licensed web font files. Precise image crops, corner radii, gradient stops and font tracking remain measured/visual reconstruction work. A4 with coincident bleed/trim boxes does not specify press-ready production. Chromium can reproduce digital RGB page designs, but native InDesign/CMYK/PDF-X equivalence must not be promised.

Before implementation approval, resolve the asset/font source, choose the first reference edition for visual acceptance (recommended: V20 with V15/17/19 exceptions), confirm additional optional section/category behaviour, and confirm folio/back-page policies. These decisions and the phased implementation/validation plan are in the inventory. No Supabase connection, application rebuild, deployment, or functionality change was performed for this analysis.

## Source fingerprints

These SHA-256 values identify the exact visually inspected files:

```text
Vol 15  965256c1a91285e9de33f6c904a414d1c486dc96040b9c3ad6c9ff638fbcabbc
Vol 17  5e6900735bbe1fa8cac0f89fbd320be49d0cebe1a378933f4253f1b77e7f1804
Vol 19  9e96a52fc92bdbd2946b39396fc817e45703a6076072f6bb89bf2fc6ca58a8fd
Vol 20  25af29c06951a08032f1bd14b8a91d2a0c092748dc9717a0b6e3d70b3ff762d9
```
