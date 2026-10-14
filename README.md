# ECU Connect Magazine Builder

An initial local editorial workspace built with Next.js App Router, TypeScript and Tailwind CSS. Volume 21 is clearly labeled fictional demonstration content, not ECU Worldwide announcements or approved copy.

## Run locally

Node.js 22+ and npm are required. From the repository root:

```sh
npm ci
 # Skip this download if /usr/bin/chromium is already installed.
PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" npx playwright install chromium
npm run dev
```

On Windows (PowerShell), install Chromium into the same repository cache with:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.cache\ms-playwright"; npx playwright install chromium
```

Chromium also needs Linux system libraries. If missing, use Playwright's supported `install-deps chromium` command with system package installation permissions. The PDF endpoint and browser tests use `/usr/bin/chromium` when available, or `CHROMIUM_EXECUTABLE_PATH` when supplied. Otherwise the Next configuration and Playwright test configuration use the repository's `.cache/ms-playwright` by default; set `PLAYWRIGHT_BROWSERS_PATH` to override. npm's cloud cache is configured at `/workspace/.cache/npm`; outside the cloud use `npm ci --cache /your/writable/cache`.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

E2E tests start the production server if one is not already running. They exercise issue creation, editing, save/reload, pagination, conditional sections, responsive widths, PDF download, and export warnings. `npm run start` starts a previously built production app.

## Working slice

Create an issue on the dashboard, add any of the seven section types, rename them, select feature/dispatch/bulletin templates, reorder or exclude sections, then add and reorder stories. Stories can be excluded individually and can inherit or override section templates/themes; opening and continuation page masters can be selected separately. Issue-level furniture switches control section headers, the issue/date footer, printed folios and the yellow top accent. Story blocks support paragraphs, headings, pull quotes and bullet lists, with inline **bold** and _italic_ marks (select text and use the block toolbar). Save explicitly; unsaved edits have a status indicator and navigation warning. Preview/export uses current edits even before saving.

The `IssueRepository` contract isolates storage from the UI. Its current adapter stores validated JSON in browser localStorage, seeds Volume 21 only on first use, and reports storage errors instead of overwriting corrupt data. No Supabase account is needed. A Supabase adapter can implement the same async list/get/save/remove methods. Browser data is specific to the current origin/profile and is not shared between users or devices. Clearing browser storage removes it.

## Pagination and PDF

`src/magazine/document.ts` produces one self-contained A4 document for both the sandboxed preview iframe and server Chromium. Shared page components include the cover, running header/footer, contents rows and typed content blocks. The browser measures rendered heights, flows blocks onto new pages and splits oversized text at word boundaries (Unicode-safe fallback). No text is silently shrunk or clipped. Every story starts on a fresh page. Contents pagination is reserved before stories and page references are populated from actual page positions, including multi-page stories. All contents pages appear together immediately after the cover, without printed folios. The first article is printed folio 1 after the final contents page: physical page 3 with one contents page, or later with multiple contents pages. Article continuations advance folios and TOC references use actual story starts without clipping or shrinking contents text.

`POST /api/export` accepts a validated issue snapshot, renders the same document with Playwright, checks layout warnings and returns an A4 PDF attachment. Invalid input returns 400; oversized payloads return 413; unresolved layout/cover overflow returns 422. External renderer requests are blocked. Chromium processes are closed after export. PDF requires a Node server with Chromium binaries and libraries; it is not an Edge or static-host export.

Current limits: basic rich-text blocks, system fonts, no images/uploads, single-column story layouts, 300-page/1 MB export caps, no widow/orphan or hyphenation rules. Long blocks may split across pages. Browser fonts can differ from server Chromium, so the PDF remeasures its own pages; its contents numbers remain accurate for that export. This is an RGB editorial proof, not press-ready CMYK, bleed, crop marks or PDF/X. Templates and copy are editable starting points, not approved corporate artwork or announcements.

The export endpoint is intended for this local milestone. Before public multiuser hosting, add authentication, authorization, export concurrency/rate limits and durable storage. No deployment, collaboration, AI rewriting, approvals or freeform canvas is included.

## Architecture

- `src/domain`: validated issue/section/story/block types and labeled sample data.
- `src/repositories`: replaceable persistence interface and local adapter.
- `src/components`: dashboard, issue editor, structured story editor, shell and preview.
- `src/magazine`: shared templates, page components and measured pagination.
- `src/app/api/export`: isolated Chromium PDF path.

## Phase 3A foundations

The approved Volume 20 baseline now has shared A4/15 mm geometry, blue `#034EA2` and yellow `#FFDD00` tokens, typed DOM page masters and a shared measured renderer. The three existing layouts remain selectable; `editorial` and `paper` add plain-article and inset-paper foundations. These are not complete reproductions of the 17 reference template families. The dashboard/shell styling is unchanged; editor additions are small appearance controls.

Issue records have `schemaVersion: 2`. `migrateIssue()` accepts the original unversioned/v1 schema and preserves all prior text, IDs, section/template ordering, dates and sample status. Reads do not rewrite browser storage; explicit save writes validated v2 records under the existing localStorage key. Future versions and unknown fields are rejected instead of silently discarded. Do not clear localStorage to upgrade.

Themes resolve from issue → section → story. Story template and page-master choices independently inherit from their parent; a continuation can use a different master. Physical PDF index, printed folio and furniture visibility are separate. Footer folios use `1`, `2`, etc.; contents references use `01`, `02`, etc. Font families prefer Poppins/Impact where installed; no original font files are bundled or extracted. The preview explicitly reports system fallback typography.

`MediaAssetRepository` separates local binary assets from issue JSON. Its Phase 3A adapter is in-memory/session-only and tests metadata limits and copy isolation. Story media references have alt text, caption, credit and focal point. Upload UI, durable asset storage and image placement are deferred; a nonempty media reference currently raises a clear layout warning and blocks PDF export rather than silently omitting it. No external storage or Supabase is introduced.

See [the Phase 3A report](docs/phase3a-implementation.md) for every changed file, validation, screenshots, branch status and limits. The archived Phase 1 sample PDF is retained at its original path. The separate foundation proof is `/previews/ecu-phase3a-foundation.pdf`.
