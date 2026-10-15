# Phase 3C implementation plan

Baseline: `b6d715489a95126e66fb0ac3c1590e21e872b019` on `phase3b/visual-templates`. Work branch: `phase3c/editorial-templates`. Original design/inventory documents remain the authority and are unchanged.

All four reference PDFs were rasterized and body pages visually inspected in labeled six-page sheets. Detailed first-batch views: V20 PDF p4/5, V17 p12, V19 p4 and V15 p5/9. No fonts were extracted. Reference pages below are physical PDF pages, not printed folios.

| Batch | Inventory family | Exact reference pages | Scope |
| --- | --- | --- | --- |
| 1, this review | T04 Editorial continuation | V20 p4–5; V17 p12 (narrative columns); V19 p4; V15 p6–7 | Full-width prose, ordered figures/captions, yellow callout, 9/12 pt subheads/body; explicit one/two-column narrative; continued pages with small masthead/tab. V17 p12's full-width semantic table is deferred, not replaced by invented data. |
| 2 | T05 Inset paper continuation | V15 p9–13; V17 p7–10, p14, p16–17 | Panel/transcript quotations, inline photo/text regions, placed-document variant. |
| 3 | T06 Person/organizational announcement | V15 p14–15; V20 p6–10 | Alternating portrait/ribbon regions; category label; T03 opener decoration when required. New Office: V19 p3–5 uses T03/T04 plus profile/office details, not a new template ID. |
| 4 | T07 Event/team gallery | V15 p18–21; V19 p8–9; V20 p13–15 | Photo-led stories, row-preserving mixed photo compositions and credits. |
| 5 | T08/T09 Operations Dashboard | V15 p16–17; V19 p10–11; V20 p11–12 | Branded artwork, header strip, screenshots, benefits/contact modules. |
| 6 | T10/T11 Notice Board | V15 p22–24; V17 p18–19; V19 p12–17; V20 p16 | Background notice/panel, structured tables, repeated headers and notice continuations. Branded information tables also occur V17 p12/p14–15. |
| 7 | T12 Leadership media | V17 p5 | Still, blue/white panel, standfirst and approved platform actions. |
| 8 | T13/T14 ECU Worldwide Way | V15 p25–26; V17 p20–21; V19 p18–19; V20 p17–18 | Paired fixed axis/principle layouts with approved wordmark. |
| 9 | T15/T16 Holidays | V15 p27–28; V17 p22–23; V19 p20–21; V20 p19 | Grouped dates/rows, dedicated background/header variants. |
| 10 | T17 Contribution/social | V15 p29; V17 p24; V19 p22; V20 p20 | Contribution deadline/card, social/QR inputs and back-page folio exception. |

What's Up and Special Feature are section/category identities spanning T03–T09, not generic article templates. Existing seven section presets, ordering, opt-outs and saved data remain intact. Leadership can already be named as a section; its distinct T12 master is deferred.

First batch acceptance: additive model/editor fields, shared preview/export rendering, deterministic font/image measurements, text-preserving approved continuation with unchanged typography/column count, actionable fixed-block warnings, lint/typecheck/unit/browser/PDF verification, screenshots and visual comparison report. No API size-limit or Chromium selection changes. Stop after this batch and commit locally for review; no deployment or merge.
