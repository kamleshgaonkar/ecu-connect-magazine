import { test, expect } from "@playwright/test";
import { magazineDocument } from "../src/magazine/document";
import { sampleIssue } from "../src/domain/sample";
import { makeRow } from "../src/domain/grid";
import { initialGrid } from "../src/studio/grid-layout";
async function ready(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => window.__magazineReady);
}
test("linked measured text crosses unequal cells and A4 continuation without loss or overlap", async ({
  page,
  request,
}) => {
  const issue = structuredClone(sampleIssue);
  issue.sections = issue.sections.slice(0, 1);
  const story = issue.sections[0].stories[0];
  story.blocks = [
    {
      id: "long",
      type: "paragraph",
      text:
        "A continuous **styled** article with paragraph boundaries. ".repeat(
          330,
        ) + "END_OF_FLOW",
    },
  ];
  const a = makeRow([7, 5]);
  a.heightMode = "fixed";
  a.heightMm = 50;
  a.cells.forEach((c) => (c.flow = true));
  const b = makeRow();
  b.heightMode = "fixed";
  b.heightMm = 55;
  const continuation = makeRow([6, 6]);
  continuation.cells.forEach((c) => (c.flow = true));
  story.grid = { rows: [a, b], continuation: [continuation] };
  await page.setContent(magazineDocument(issue));
  await ready(page);
  const result = await page.evaluate(() => window.__magazineResult!);
  expect(result.warnings).toEqual([]);
  expect(result.pages).toBeGreaterThan(3);
  const texts = await page
    .locator('.magazine-grid-cell [data-content-id="long"]')
    .allTextContents();
  expect(texts.join("")).toBe(story.blocks[0].text.replaceAll("**", ""));
  expect(
    await page.locator(".magazine-grid-cell strong").count(),
  ).toBeGreaterThan(2);
  expect(
    await page.locator(".magazine-grid-row").evaluateAll((rows) =>
      rows.every((row) => {
        const page = row.closest(".page")!,
          body = page.querySelector(".page-body")!;
        return (
          row.getBoundingClientRect().bottom <=
          body.getBoundingClientRect().bottom + 2
        );
      }),
    ),
  ).toBe(true);
  const response = await request.post("/api/export", { data: issue });
  expect(response.ok()).toBe(true);
  const pdf = await response.body();
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(
    (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length,
  ).toBe(result.pages);
});
test("oversized grid rows report actionable overflow and block export", async ({
  page,
  request,
}) => {
  const issue = structuredClone(sampleIssue);
  issue.sections = issue.sections.slice(0, 1);
  const story = issue.sections[0].stories[0];
  const row = makeRow();
  row.heightMode = "fixed";
  row.heightMm = 240;
  row.paddingMm = 15;
  row.gapMm = 15;
  story.grid = { rows: [row], continuation: [makeRow()] };
  await page.setContent(magazineDocument(issue));
  await ready(page);
  expect(
    (await page.evaluate(() => window.__magazineResult!.warnings)).join(" "),
  ).toContain("Grid row cannot fit");
  expect((await request.post("/api/export", { data: issue })).ok()).toBe(false);
});
test("floating controls reveal on hover and focus while layout edits preserve source content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/issues/" + sampleIssue.id);
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  const toolbar = page.locator(".preview-floating");
  await page.mouse.move(10, 10);
  await expect(toolbar).toHaveCSS("opacity", "0");
  await page.locator(".workspace-preview").hover();
  await expect(toolbar).toHaveCSS("opacity", "1");
  await page.mouse.move(10, 10);
  await page.getByRole("button", { name: "Fit page", exact: true }).focus();
  await expect(toolbar).toHaveCSS("opacity", "1");
  const source = await page
    .getByLabel("Block 1 text", { exact: true })
    .inputValue();
  await page
    .getByRole("button", { name: "Insert layout 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Layout 70/30", exact: true })
    .click();
  await expect(page.locator(".visual-grid-row")).toHaveCount(2);
  await page
    .getByLabel("Resize grid columns 1", { exact: true })
    .first()
    .focus();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Undo layout", exact: true }).click();
  await expect(page.getByLabel("Block 1 text", { exact: true })).toHaveValue(
    source,
  );
  await page.getByLabel("Layout actions 1", { exact: true }).click();
  await page
    .getByRole("button", { name: "Duplicate layout", exact: true })
    .click();
  await expect(page.locator(".visual-grid-row")).toHaveCount(3);
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Layout actions 1", { exact: true }).click();
  await page
    .getByRole("button", { name: "Remove layout", exact: true })
    .click();
  await expect(page.getByLabel("Block 1 text", { exact: true })).toHaveValue(
    source,
  );
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".visual-grid-row")).toHaveCount(2);
  await expect(page.getByLabel("Block 1 text", { exact: true })).toHaveValue(
    source,
  );
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  await page.screenshot({ path: "test-results/visual-grid-editor.png" });
});
import { readFileSync } from "node:fs";
test("image placement rules reflow linked text, retain captions and survive presets", async ({
  page,
}) => {
  const issue = structuredClone(sampleIssue);
  issue.sections = issue.sections.slice(0, 1);
  const story = issue.sections[0].stories[0];
  const bytes = readFileSync("tests/fixtures/crop-calibration.png");
  issue.renderAssets = [
    {
      asset: {
        id: "grid-photo",
        name: "Grid fixture",
        mimeType: "image/png",
        width: 320,
        height: 200,
        byteLength: bytes.length,
      },
      dataUrl: "data:image/png;base64," + bytes.toString("base64"),
    },
  ];
  story.blocks = [
    {
      id: "article-source",
      type: "paragraph",
      text: "Linked paragraphs flow around the real photograph. ".repeat(150),
    },
    {
      id: "photo-source",
      type: "figure",
      text: "Approved caption",
      image: {
        assetId: "grid-photo",
        alt: "Grid photograph",
        caption: "Photograph caption",
        credit: "Credit",
        fit: "contain",
        focalPoint: { x: 0.5, y: 0.5 },
      },
    },
  ];
  story.grid = initialGrid(story);
  story.grid.rows[0].cells[1].imageHeightMm = 40;
  story.grid.rows[0].cells[1].imageFit = "contain";
  await page.setContent(magazineDocument(issue));
  await ready(page);
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  const first = await page
    .locator('.magazine-grid-cell [data-content-id="article-source"]')
    .first()
    .textContent();
  await expect(page.locator(".magazine-grid-cell img")).toHaveCSS(
    "object-fit",
    "contain",
  );
  await expect(page.locator(".magazine-grid-cell figcaption")).toContainText(
    "Photograph caption",
  );
  story.grid.rows[0].cells[1].imageHeightMm = 90;
  await page.goto("about:blank");
  await page.setContent(magazineDocument(issue));
  await ready(page);
  expect(
    (await page
      .locator('.magazine-grid-cell [data-content-id="article-source"]')
      .first()
      .textContent())!.length,
  ).toBeGreaterThan(first!.length);
  expect(
    (
      await page
        .locator('.magazine-grid-cell [data-content-id="article-source"]')
        .allTextContents()
    ).join(""),
  ).toBe(story.blocks[0].text);
});

test("row and content dragging plus preset reuse preserve magazine data", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/issues/" + sampleIssue.id);
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  await page
    .getByRole("button", { name: "Insert layout 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Layout 70/30", exact: true })
    .click();
  const firstId = await page
    .locator(".visual-grid-row")
    .first()
    .getAttribute("data-grid-row");
  await page.locator(".visual-grid-row").first().hover();
  await page
    .getByRole("button", { name: "Drag layout 1", exact: true })
    .dragTo(page.locator(".visual-grid-row").nth(1));
  expect(
    await page.locator(".visual-grid-row").nth(1).getAttribute("data-grid-row"),
  ).toBe(firstId);
  const target = page
    .locator(".visual-grid-row")
    .nth(1)
    .locator(".visual-grid-cell")
    .nth(1);
  await page.locator(".grid-source-entry").first().hover();
  await page
    .getByRole("button", { name: "Drag content 1", exact: true })
    .dragTo(target);
  await expect(target.locator(".cell-content")).toHaveCount(1);
  await page.getByText("Saved layouts & continuation", { exact: true }).click();
  await page
    .getByLabel("Layout name", { exact: true })
    .fill("Reusable editorial grid");
  await page
    .getByRole("button", { name: "Save layout preset", exact: true })
    .click();
  const presets = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ecu-connect:grid-presets:v1")!),
  );
  expect(presets).toHaveLength(1);
  expect(
    presets[0].grid.rows.flatMap((r: { cells: { contentIds: string[] }[] }) =>
      r.cells.flatMap((c) => c.contentIds),
    ),
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Use saved layout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reusable editorial grid", exact: true })
    .click();
  await expect(page.getByLabel("Block 1 text", { exact: true })).toHaveValue(
    sampleIssue.sections[0].stories[0].blocks[0].text,
  );
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".visual-grid-row")).toHaveCount(2);
});

test("manual source page breaks keep linked article reading order", async ({
  page,
}) => {
  const issue = structuredClone(sampleIssue);
  issue.sections = issue.sections.slice(0, 1);
  const story = issue.sections[0].stories[0];
  story.blocks = [
    { id: "before-break", type: "paragraph", text: "Before the manual break." },
    {
      id: "after-break",
      type: "paragraph",
      text: "After the manual break.",
      breakBefore: "page",
    },
  ];
  story.grid = { rows: [makeRow()], continuation: [makeRow()] };
  await page.setContent(magazineDocument(issue));
  await ready(page);
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  const physical = await page
    .locator(".magazine-grid-cell [data-content-id]")
    .evaluateAll((nodes) =>
      nodes.map((n) => n.closest(".page")?.getAttribute("data-physical-page")),
    );
  expect(physical[0]).not.toBe(physical[1]);
});

test("continuation layouts have independent editable rows and preserve the opening layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/issues/" + sampleIssue.id);
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  await page
    .getByRole("button", { name: "Continuation layout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Insert layout 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Layout 50/50", exact: true }).click();
  await expect(page.locator(".visual-grid-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Opening layout", exact: true })
    .click();
  await expect(page.locator(".visual-grid-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  const grid = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0].sections[0]
        .stories[0].grid,
  );
  expect(grid.rows).toHaveLength(1);
  expect(grid.continuation).toHaveLength(2);
  expect(grid.continuation[0].cells).toHaveLength(2);
  await page.reload();
  await page
    .getByRole("button", { name: "Continuation layout", exact: true })
    .click();
  await expect(page.locator(".visual-grid-row")).toHaveCount(2);
});
