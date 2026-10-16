import { test, expect, type Page } from "@playwright/test";
import { sampleIssue } from "../src/domain/sample";
import { makeRow } from "../src/domain/grid";
function fixture() {
  const issue = structuredClone(sampleIssue);
  issue.sections = issue.sections.slice(0, 1);
  const story = issue.sections[0].stories[0];
  story.title = "Official story headline";
  story.subtitle = "Official introduction";
  story.byline = "Official author";
  story.blocks = [
    {
      id: "source-copy",
      type: "paragraph",
      text: "Original official article.",
    },
  ];
  const row = makeRow([6, 6]);
  row.cells[0].blocks = [
    { id: "linked-head", kind: "linked", source: "headline" },
    { id: "linked-intro", kind: "linked", source: "introduction" },
    { id: "linked-author", kind: "linked", source: "author" },
    { id: "linked-copy", kind: "linked", source: "article" },
  ];
  row.cells[1].blocks = [
    {
      id: "manual-copy",
      kind: "manual",
      type: "paragraph",
      text: "Manual paragraph",
    },
    {
      id: "manual-list",
      kind: "manual",
      type: "list",
      ordered: false,
      text: "First item",
    },
    {
      id: "manual-head",
      kind: "manual",
      type: "heading",
      level: 2,
      text: "Independent heading",
    },
  ];
  story.grid = { rows: [row], continuation: [makeRow()] };
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
const block = (page: Page, id: string) =>
  page.locator('[data-layout-block="' + id + '"]');
async function save(page: Page) {
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

test("one click edits text directly, retains cursor selection and Enter creates list items without touching official data", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const issue = await open(page),
    source = issue.sections[0].stories[0];
  const text = block(page, "manual-copy").getByRole("textbox");
  await text.click();
  await expect(text).toBeFocused();
  await text.press("End");
  await text.pressSequentially(" edited");
  await expect(text).toHaveValue("Manual paragraph edited");
  await text.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(7, 16));
  await page.keyboard.type("copy");
  await expect(text).toHaveValue("Manual copy edited");
  await expect(text).toBeFocused();
  const list = block(page, "manual-list").getByRole("textbox");
  await list.click();
  await list.press("End");
  await list.press("Enter");
  await list.pressSequentially("Second item");
  await expect(list).toHaveValue("First item\nSecond item");
  const heading = block(page, "manual-head").getByRole("textbox");
  await heading.click();
  await heading.fill("Manual heading is not the index title");
  const frame = page.frameLocator("iframe");
  await expect(frame.locator(".magazine-grid-cell ul li")).toHaveText([
    "First item",
    "Second item",
  ]);
  await expect(frame.locator(".toc-story-title")).toHaveText([source.title]);
  const saved = await save(page),
    story = saved.sections[0].stories[0];
  expect({ ...story, grid: undefined }).toEqual({ ...source, grid: undefined });
  expect(
    story.grid.rows[0].cells[1].blocks.map((b: { text: string }) => b.text),
  ).toEqual([
    "Manual copy edited",
    "First item\nSecond item",
    "Manual heading is not the index title",
  ]);
  await page.reload();
  await expect(block(page, "manual-list").getByRole("textbox")).toHaveValue(
    "First item\nSecond item",
  );
  expect(errors).toEqual([]);
});

test("Quick Add is a single searchable menu with keyboard insertion and immediate text focus in new grids", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Insert layout 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Layout 70/30", exact: true }).click();
  const cell = page
      .locator(".visual-grid-row")
      .first()
      .locator(".visual-grid-cell")
      .first(),
    summary = cell.locator(".layout-add-content > summary");
  await summary.click();
  const search = cell.getByRole("textbox", {
    name: "Search content",
    exact: true,
  });
  await expect(search).toBeFocused();
  await expect(
    cell.getByRole("group", { name: "Linked Content", exact: true }),
  ).toBeVisible();
  await expect(
    cell.getByRole("group", { name: "Manual Content", exact: true }),
  ).toBeVisible();
  await expect(
    cell.getByRole("button", { name: "Linked Content", exact: true }),
  ).toHaveCount(0);
  await search.fill("h3");
  await expect(cell.locator(".layout-content-results button")).toHaveCount(1);
  await search.press("Enter");
  const text = cell.getByLabel("Manual content text", { exact: true });
  await expect(text).toBeFocused();
  await text.pressSequentially("Added in one step");
  await summary.click();
  await search.fill("no-such-content");
  await expect(cell.getByRole("status")).toHaveText("No matching content");
  await search.press("Escape");
  await expect(summary).toBeFocused();
  await expect(cell.locator(".layout-add-content")).not.toHaveAttribute("open");
  await summary.click();
  await search.fill("list");
  await expect(cell.locator(".layout-content-results button")).toHaveCount(2);
  await search.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(cell.locator("[data-layout-block]")).toHaveCount(2);
  await expect(
    cell.getByLabel("Manual content text", { exact: true }).last(),
  ).toBeFocused();
  await cell
    .getByLabel("Manual content text", { exact: true })
    .last()
    .fill("Number one");
  const saved = await save(page);
  expect(
    saved.sections[0].stories[0].grid.rows[0].cells[0].blocks[1],
  ).toMatchObject({ type: "list", ordered: true, text: "Number one" });
});

test("selection shows one floating toolbar while row options remain contextual without checkbox clutter", async ({
  page,
}) => {
  const issue = await open(page);
  await page.mouse.move(8, 8);
  const toolbar = block(page, "manual-copy").getByRole("toolbar");
  await expect(toolbar).toHaveCSS("opacity", "0");
  await expect(
    page.getByText("Drop content here", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: /Link text in cell/ }),
  ).toHaveCount(0);
  await expect(page.getByText("Layout settings", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("region", { name: "Row options", exact: true }),
  ).toHaveCount(0);
  await block(page, "manual-copy").getByRole("textbox").click();
  await page.mouse.move(8, 8);
  await expect(toolbar).toHaveCSS("opacity", "1");
  await expect(
    toolbar.getByRole("button", { name: "Duplicate block", exact: true }),
  ).toBeVisible();
  await block(page, "manual-head").getByRole("textbox").click();
  await page.mouse.move(8, 8);
  await expect(toolbar).toHaveCSS("opacity", "0");
  await expect(
    page.locator('[data-layout-block][data-selected="true"]'),
  ).toHaveCount(1);
  await block(page, "manual-head").getByLabel("Content actions 3").click();
  await block(page, "manual-head")
    .getByLabel("Manual heading level")
    .selectOption("4");
  await page.getByLabel("Headline", { exact: true }).click();
  await page.mouse.move(8, 8);
  await expect(
    page.locator('[data-layout-block][data-selected="true"]'),
  ).toHaveCount(0);
  const row = page.locator(".visual-grid-row").first();
  await row.hover();
  await page
    .getByRole("button", { name: "Row options 1", exact: true })
    .click();
  const options = page.getByRole("region", {
    name: "Row options",
    exact: true,
  });
  await expect(options).toBeVisible();
  await options.getByLabel("Row columns", { exact: true }).selectOption("3");
  await expect(row.locator(".visual-grid-cell")).toHaveCount(3);
  await options
    .getByRole("button", { name: "Continue article in column 3", exact: true })
    .click();
  await expect(
    options.getByRole("button", {
      name: "Continue article in column 3",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Row options 1", exact: true })
    .click();
  await expect(options).toHaveCount(0);
  const saved = await save(page);
  expect(saved.sections[0].stories[0].title).toBe(
    issue.sections[0].stories[0].title,
  );
  expect(
    saved.sections[0].stories[0].grid.rows[0].cells[1].blocks[2].level,
  ).toBe(4);
});

test("direct linked editing updates the official source fields and automatic index without rewriting manual blocks", async ({
  page,
}) => {
  const issue = await open(page),
    original = issue.sections[0].stories[0];
  await block(page, "linked-head")
    .getByLabel("Linked Headline", { exact: true })
    .fill("Linked edit becomes official");
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(
    "Linked edit becomes official",
  );
  await block(page, "linked-intro")
    .getByLabel("Linked Introduction", { exact: true })
    .fill("New official introduction");
  await expect(
    page.getByRole("textbox", { name: "Introduction", exact: true }),
  ).toHaveValue("New official introduction");
  await block(page, "linked-author")
    .getByLabel("Linked Author", { exact: true })
    .fill("New official author");
  await expect(page.getByLabel("Author", { exact: true })).toHaveValue(
    "New official author",
  );
  await block(page, "linked-copy")
    .getByRole("button", { name: "Original official article.", exact: true })
    .click();
  const text = page.getByLabel("Linked Article block 1", { exact: true });
  await expect(text).toBeFocused();
  await text.press("End");
  await text.pressSequentially(" Direct source update.");
  await expect(page.getByLabel("Block 1 text", { exact: true })).toHaveValue(
    "Original official article. Direct source update.",
  );
  await expect(
    page.frameLocator("iframe").locator(".toc-story-title"),
  ).toHaveText(["Linked edit becomes official"]);
  await expect(
    page.frameLocator("iframe").locator('[data-content-id="source-copy"]'),
  ).toHaveText("Original official article. Direct source update.");
  const saved = await save(page),
    story = saved.sections[0].stories[0];
  expect(story.blocks).toEqual([
    {
      ...original.blocks[0],
      text: "Original official article. Direct source update.",
    },
  ]);
  expect(story.grid.rows[0].cells[1].blocks).toEqual(
    original.grid!.rows[0].cells[1].blocks,
  );
});

test("layout undo/redo coalesces direct typing and retains canonical data", async ({
  page,
}) => {
  const issue = await open(page);
  const text = block(page, "manual-copy").getByRole("textbox");
  await text.click();
  await text.press("End");
  await text.pressSequentially(" many keystrokes");
  await expect(text).toHaveValue("Manual paragraph many keystrokes");
  await page.getByRole("button", { name: "Undo layout", exact: true }).click();
  await expect(text).toHaveValue("Manual paragraph");
  await page.getByRole("button", { name: "Redo layout", exact: true }).click();
  await expect(text).toHaveValue("Manual paragraph many keystrokes");
  await block(page, "manual-copy").hover();
  await block(page, "manual-copy")
    .getByRole("button", { name: "Duplicate block", exact: true })
    .click();
  await expect(page.locator("[data-layout-block]")).toHaveCount(8);
  await page.getByRole("button", { name: "Undo layout", exact: true }).click();
  await expect(page.locator("[data-layout-block]")).toHaveCount(7);
  const saved = await save(page);
  expect(saved.sections[0].stories[0].blocks).toEqual(
    issue.sections[0].stories[0].blocks,
  );
  await block(page, "manual-copy").getByRole("textbox").click();
  await page.screenshot({ path: "test-results/page-builder-ux.png" });
});
