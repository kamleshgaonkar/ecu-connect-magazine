import { test, expect, type Page, type Locator } from "@playwright/test";
import { readFileSync } from "node:fs";
import { sampleIssue } from "../src/domain/sample";
import { makeRow } from "../src/domain/grid";
import { magazineDocument } from "../src/magazine/document";
function fixture(long = false) {
  const issue = structuredClone(sampleIssue);
  issue.sections = issue.sections.slice(0, 1);
  const story = issue.sections[0].stories[0];
  story.title = "Official index headline";
  story.subtitle = "Official introduction";
  story.byline = "Official author";
  story.blocks = [
    {
      id: "official-copy",
      type: "paragraph",
      text: long
        ? "Linked article text flows across A4 pages. ".repeat(280) + "FLOW_END"
        : "Official article content remains untouched.",
    },
  ];
  story.grid = { rows: [makeRow([6, 6])], continuation: [makeRow([6, 6])] };
  story.grid.continuation[0].cells.forEach((c) => (c.flow = true));
  return issue;
}
async function open(page: Page) {
  const issue = fixture();
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript((data) => {
    if (window === window.top && !localStorage.getItem("ecu-connect:issues:v1"))
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, issue);
  await page.goto("/issues/" + issue.id);
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  return issue;
}
async function add(cell: Locator, category: string, choice: string) {
  await cell.locator(".layout-add-content > summary").click();
  await cell
    .getByRole("group", { name: category, exact: true })
    .getByRole("button", {
      name: choice === "Article Content" ? "Article" : choice,
      exact: true,
    })
    .click();
}
async function save(page: Page) {
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved locally" }),
  ).toBeVisible();
}

test("linked official fields update live while manual blocks stay independent; order, duplicate, delete and resize persist", async ({
  page,
}) => {
  const issue = await open(page),
    source = issue.sections[0].stories[0];
  const cells = page
      .locator(".visual-grid-row")
      .first()
      .locator(".visual-grid-cell"),
    left = cells.nth(0),
    right = cells.nth(1);
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(
    source.title,
  );
  await add(left, "Linked Content", "Headline");
  await add(left, "Linked Content", "Introduction");
  await add(left, "Linked Content", "Author");
  await add(left, "Linked Content", "Article Content");
  await add(right, "Manual Content", "H1");
  await right
    .getByLabel("Manual content text", { exact: true })
    .last()
    .fill("Manual heading excluded from index");
  await add(right, "Manual Content", "Paragraph");
  await right
    .getByLabel("Manual content text", { exact: true })
    .last()
    .fill("Independent manual paragraph");
  await page
    .getByLabel("Headline", { exact: true })
    .fill("Updated official headline");
  await page
    .getByRole("textbox", { name: "Introduction", exact: true })
    .fill("Updated official introduction");
  await page
    .getByLabel("Author", { exact: true })
    .fill("Updated official author");
  const updatedCopy = "Updated official Article Content.";
  await page.getByLabel("Block 1 text", { exact: true }).fill(updatedCopy);
  const frame = page.frameLocator("iframe");
  await expect(frame.locator('[data-content-id="official-copy"]')).toHaveText(
    updatedCopy,
  );
  await expect(frame.locator(".toc-story-title")).toHaveText([
    "Updated official headline",
  ]);
  await expect(frame.locator(".magazine-grid-cell .story-title")).toHaveText(
    "Updated official headline",
  );
  await expect(frame.locator(".magazine-grid-cell .subtitle")).toHaveText(
    "Updated official introduction",
  );
  await expect(frame.locator(".story-author-credit")).toHaveText(
    "Updated official author",
  );
  await expect(frame.locator(".magazine-grid-cell h1")).toHaveText(
    "Manual heading excluded from index",
  );
  const paragraph = right.locator("[data-layout-block]").nth(1);
  await paragraph.hover();
  await paragraph
    .getByRole("button", { name: "Duplicate block", exact: true })
    .click();
  await expect(right.locator("[data-layout-block]")).toHaveCount(3);
  await right.locator("[data-layout-block]").nth(2).hover();
  await right
    .getByRole("button", { name: "Drag layout content 3", exact: true })
    .dragTo(left.locator("[data-layout-block]").first());
  await expect(left.locator("[data-layout-block]")).toHaveCount(5);
  await expect(left.locator(".layout-block-label").first()).toHaveText(
    "Paragraph",
  );
  await right.locator("[data-layout-block]").nth(1).hover();
  await right
    .getByRole("button", { name: "Drag layout content 2", exact: true })
    .dragTo(right.locator("[data-layout-block]").first());
  await expect(right.locator(".layout-block-label").first()).toHaveText(
    "Paragraph",
  );
  const remove = right.locator("[data-layout-block]").first();
  await remove.hover();
  await remove
    .getByRole("button", { name: "Delete block", exact: true })
    .click();
  await expect(right.locator("[data-layout-block]")).toHaveCount(1);
  const divider = page
    .getByRole("separator", { name: "Resize grid columns 1", exact: true })
    .first();
  const box = (await divider.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 50, box.y + 30, { steps: 8 });
  await page.mouse.up();
  await save(page);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0],
  );
  const story = saved.sections[0].stories[0];
  expect(story.blocks).toEqual([{ ...source.blocks[0], text: updatedCopy }]);
  expect(story.grid.rows[0].cells[0].width).toBeGreaterThan(6);
  expect(story.grid.rows[0].cells[0].blocks[0].text).toBe(
    "Independent manual paragraph",
  );
  expect(story.grid.rows[0].cells[1].blocks[0].text).toBe(
    "Manual heading excluded from index",
  );
  await page.reload();
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(
    "Updated official headline",
  );
  await expect(
    page.frameLocator("iframe").locator(".toc-story-title"),
  ).toHaveText(["Updated official headline"]);
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Use approved template layout", exact: true })
    .click();
  await expect(page.locator(".layout-content-block")).toHaveCount(6);
  await page.screenshot({ path: "test-results/page-layout-builder.png" });
});

test("compact picker offers only approved ratios and both page variants retain independent layouts", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Insert layout 1", exact: true })
    .click();
  const picker = page.getByRole("group", { name: "Choose row layout" });
  await expect(picker.getByRole("button")).toHaveCount(5);
  for (const name of ["Full width", "50/50", "70/30", "30/70", "Three columns"])
    await expect(
      picker.getByRole("button", { name: "Layout " + name, exact: true }),
    ).toBeVisible();
  await picker
    .getByRole("button", { name: "Layout 30/70", exact: true })
    .click();
  await expect(page.locator(".visual-grid-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Continuation layout", exact: true })
    .click();
  await expect(page.locator(".visual-grid-row")).toHaveCount(1);
  await add(
    page.locator(".visual-grid-cell").nth(1),
    "Manual Content",
    "Quote",
  );
  await page
    .getByLabel("Manual content text", { exact: true })
    .last()
    .fill("Continuation note");
  await save(page);
  await page
    .getByRole("button", { name: "Opening layout", exact: true })
    .click();
  await expect(page.locator(".visual-grid-row")).toHaveCount(2);
  await page.reload();
  await page
    .getByRole("button", { name: "Continuation layout", exact: true })
    .click();
  await expect(
    page.getByLabel("Manual content text", { exact: true }),
  ).toHaveValue("Continuation note");
  await page.setViewportSize({ width: 390, height: 850 });
  await page
    .getByRole("button", { name: "Opening layout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Insert layout 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Layout Three columns", exact: true })
    .click();
  const row = page.locator(".visual-grid-row").first();
  for (const index of [0, 2]) {
    const cell = row.locator(".visual-grid-cell").nth(index);
    await cell.locator(".layout-add-content > summary").click();
    const menu = cell.getByRole("group", { name: "Add cell content" }),
      box = (await menu.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);

    await cell.getByRole("button", { name: "Spacer", exact: true }).click();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("linked article flow, manual elements and images share pagination/PDF while index uses official headline", async ({
  page,
  request,
}) => {
  const issue = fixture(true),
    story = issue.sections[0].stories[0],
    row = story.grid!.rows[0];
  row.cells[0].flow = false;
  row.cells[1].flow = false;
  row.cells[0].blocks = [
    { id: "linked-heading", kind: "linked", source: "headline" },
    { id: "intro", kind: "linked", source: "introduction" },
    { id: "author", kind: "linked", source: "author" },
  ];
  const bytes = readFileSync("tests/fixtures/crop-calibration.png");
  const image = {
    assetId: "manual-photo",
    alt: "Manual image",
    caption: "Manual image caption",
    credit: "Credit",
    fit: "contain" as const,
    focalPoint: { x: 0.5, y: 0.5 },
  };
  issue.renderAssets = [
    {
      asset: {
        id: image.assetId,
        name: "Manual image",
        mimeType: "image/png",
        width: 320,
        height: 200,
        byteLength: bytes.length,
      },
      dataUrl: "data:image/png;base64," + bytes.toString("base64"),
    },
  ];
  row.cells[1].blocks = [
    {
      id: "manual-h1",
      kind: "manual",
      type: "heading",
      level: 1,
      text: "Not an index title",
    },
    {
      id: "manual-list",
      kind: "manual",
      type: "list",
      ordered: true,
      text: "First item\nSecond item",
    },
    {
      id: "manual-photo-block",
      kind: "manual",
      type: "figure",
      text: "Image description",
      heightMm: 25,
      image,
    },
    { id: "rule", kind: "manual", type: "divider", text: "" },
    { id: "space", kind: "manual", type: "spacer", heightMm: 4, text: "" },
  ];
  const flow = makeRow();
  flow.heightMode = "fixed";
  flow.heightMm = 50;
  flow.cells[0].blocks = [
    { id: "linked-copy", kind: "linked", source: "article" },
  ];
  story.grid!.rows.push(flow);
  const second = {
    ...story,
    id: "second-story",
    title: "Second official headline",
    grid: undefined,
    blocks: [
      {
        id: "second-copy",
        type: "paragraph" as const,
        text: "Second story body.",
      },
    ],
  };
  issue.sections[0].stories.push(second);
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  const result = await page.evaluate(() => window.__magazineResult!);
  expect(result.pages).toBeGreaterThan(3);
  expect(
    (
      await page.locator('[data-content-id="official-copy"]').allTextContents()
    ).join(""),
  ).toBe(story.blocks[0].text);
  await expect(page.locator(".toc-story-title")).toHaveText([
    story.title,
    second.title,
  ]);
  const secondPage = result.storyPages[second.id];
  expect(secondPage.folio).toBeGreaterThan(1);
  const actualFolio = await page
    .locator('.page[data-story-id="second-story"] .page-number')
    .first()
    .textContent();
  expect(actualFolio).toBe(String(secondPage.folio));
  await expect(page.locator(".toc-number")).toHaveText([
    "01",
    String(secondPage.folio).padStart(2, "0"),
  ]);
  await expect(page.locator(".magazine-grid-cell h1")).toHaveText(
    "Not an index title",
  );
  await expect(page.locator(".magazine-grid-cell ol li")).toHaveText([
    "First item",
    "Second item",
  ]);
  await expect(page.locator(".magazine-grid-cell img")).toHaveAttribute(
    "alt",
    "Manual image",
  );
  const response = await request.post("/api/export", { data: issue });
  expect(response.ok()).toBe(true);
  expect(
    (await response.body()).toString("latin1").match(/\/Type\s*\/Page\b/g)
      ?.length,
  ).toBe(result.pages);
});
