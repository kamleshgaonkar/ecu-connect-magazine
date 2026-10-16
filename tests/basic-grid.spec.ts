import { test, expect, type Page } from "@playwright/test";
import { sampleIssue } from "../src/domain/sample";
import { makeRow } from "../src/domain/grid";
import { magazineDocument } from "../src/magazine/document";
import type { Issue } from "../src/domain/issue";
function fixture() {
  const issue = structuredClone(sampleIssue);
  const row = makeRow([6, 6]);
  row.cells[0].blocks = [
    { id: "basic-linked", kind: "linked", source: "headline" },
  ];
  row.cells[1].flow = false;
  row.cells[1].blocks = [
    {
      id: "basic-manual",
      kind: "manual",
      type: "paragraph",
      text: "Preserved hidden manual content.",
    },
  ];
  row.cells[1].contentIds = [issue.sections[0].stories[0].blocks[0].id];
  issue.sections[0].stories[0].grid = {
    rows: [row],
    continuation: [makeRow()],
  };
  return issue;
}
async function open(page: Page, issue = fixture()) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript((data) => {
    if (window === window.top && !localStorage.getItem("ecu-connect:issues:v1"))
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, issue);
  await page.goto("/issues/" + issue.id);
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  return issue;
}
const grid = (page: Page) =>
  page.getByRole("region", { name: "Visual Grid Editor", exact: true });
async function save(page: Page): Promise<Issue> {
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved locally" }),
  ).toBeVisible();
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0],
  );
}
test("basic grid hides content without changing saved layouts, linked fields or rendering", async ({
  page,
  request,
}) => {
  const original = await open(page);
  const builder = grid(page);
  await expect(
    builder.getByRole("button", { name: "Opening Page", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    builder.getByRole("button", { name: "Continuation Page", exact: true }),
  ).toBeVisible();
  await expect(builder.locator(".visual-grid-cell")).toHaveCount(2);
  expect(await builder.locator(".visual-grid-cell").allInnerTexts()).toEqual([
    "",
    "",
  ]);
  await expect(
    builder.getByRole("button", {
      name: /Add Content|Article content|Use approved template/,
    }),
  ).toHaveCount(0);
  await expect(builder.getByRole("textbox")).toHaveCount(0);
  await expect(builder.locator(".grid-presets")).toBeHidden();
  await expect(builder.locator(".grid-article-content")).toBeHidden();
  await expect(builder.locator(".grid-editor-header")).toBeHidden();
  await page.screenshot({ path: "test-results/basic-grid-controls.png", fullPage: true });
  await expect(page.locator(".story-options")).toBeHidden();
  await expect(
    page.getByRole("navigation", { name: "Magazine structure" }),
  ).toBeVisible();
  const frame = page.frameLocator("iframe");
  await expect(
    frame.getByText("Preserved hidden manual content.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Author", exact: true })
    .fill("Temporary author");
  await page
    .getByRole("textbox", { name: "Author", exact: true })
    .fill(original.sections[0].stories[0].byline);
  const saved = await save(page);
  expect(saved.sections).toEqual(original.sections);
  expect(magazineDocument(saved, "same-render")).toBe(
    magazineDocument(
      { ...original, updatedAt: saved.updatedAt },
      "same-render",
    ),
  );
  const pdf = await request.post("/api/export", { data: saved });
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  await page.reload();
  await expect(grid(page).locator(".visual-grid-cell")).toHaveCount(2);
  expect(await grid(page).locator(".visual-grid-cell").allInnerTexts()).toEqual(
    ["", ""],
  );
});
test("picker, row reorder/delete and draggable dividers preserve populated opening and continuation rows", async ({
  page,
}) => {
  const original = await open(page);
  const builder = grid(page);
  const opening = original.sections[0].stories[0].grid!.rows[0];
  for (const name of [
    "Full width",
    "50/50",
    "70/30",
    "30/70",
    "Three columns",
  ]) {
    await builder
      .getByRole("button", { name: "Insert layout 2", exact: true })
      .click();
    await expect(
      builder
        .getByRole("group", { name: "Choose row layout" })
        .getByRole("button"),
    ).toHaveCount(5);
    await builder
      .getByRole("button", { name: "Layout " + name, exact: true })
      .click();
    const empty = builder.locator(".visual-grid-row").nth(1);
    expect(await empty.locator(".visual-grid-cell").count()).toBe(
      name === "Full width" ? 1 : name === "Three columns" ? 3 : 2,
    );
    expect(await empty.locator(".visual-grid-cell").allInnerTexts()).toEqual(
      Array(name === "Full width" ? 1 : name === "Three columns" ? 3 : 2).fill(
        "",
      ),
    );
    await empty.hover();
    await empty.locator("summary[aria-label^='Layout actions']").click();
    await empty.getByRole("button", { name: "Move up", exact: true }).click();
    const moved = builder.locator(".visual-grid-row").first();
    await moved.hover();
    await moved.locator("summary[aria-label^='Layout actions']").click();
    page.once("dialog", (d) => d.accept());
    await moved
      .getByRole("button", { name: "Remove layout", exact: true })
      .click();
    await expect(builder.locator(".visual-grid-row")).toHaveCount(1);
  }
  const divider = builder.getByRole("separator", {
    name: "Resize grid columns 1",
    exact: true,
  });
  const box = (await divider.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 45, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  const populated = builder.locator(".visual-grid-row").first();
  await populated.hover();
  await populated.locator("summary[aria-label^='Layout actions']").click();
  await expect(
    populated.getByRole("button", { name: "Remove layout", exact: true }),
  ).toBeDisabled();
  await expect(
    populated.getByRole("button", { name: "Duplicate layout", exact: true }),
  ).toHaveCount(0);
  await builder
    .getByRole("button", { name: "Continuation Page", exact: true })
    .click();
  await expect(builder.locator(".visual-grid-cell")).toHaveCount(1);
  await builder
    .getByRole("button", { name: "Insert layout 2", exact: true })
    .click();
  await builder
    .getByRole("button", { name: "Layout Three columns", exact: true })
    .click();
  const saved = await save(page),
    current = saved.sections[0].stories[0].grid!;
  expect(current.rows[0].cells[0].width).not.toBe(6);
  expect(current.rows[0].cells.map((c) => c.blocks)).toEqual(
    opening.cells.map((c) => c.blocks),
  );
  expect(current.rows[0].cells.map((c) => c.contentIds)).toEqual(
    opening.cells.map((c) => c.contentIds),
  );
  expect(current.continuation[0]).toEqual(
    original.sections[0].stories[0].grid!.continuation[0],
  );
  expect(current.continuation[1].cells.map((c) => c.width)).toEqual([4, 4, 4]);
  expect(saved.sections[0].stories[0].blocks).toEqual(
    original.sections[0].stories[0].blocks,
  );
  await builder
    .getByRole("button", { name: "Opening Page", exact: true })
    .click();
  await expect(builder.locator(".visual-grid-cell")).toHaveCount(2);
});
test("viewing both page variants of a legacy story does not materialize or overwrite its layout", async ({
  page,
}) => {
  const original = await open(page, structuredClone(sampleIssue));
  for (const name of ["Continuation Page", "Opening Page"])
    await grid(page).getByRole("button", { name, exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save Magazine", exact: true }),
  ).toBeDisabled();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0],
  );
  expect(saved).toEqual(original);
  expect(saved.sections[0].stories[0].grid).toBeUndefined();
});
