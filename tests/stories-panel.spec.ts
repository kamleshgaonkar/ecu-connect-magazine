import { test, expect, type Page } from "@playwright/test";
import { sampleIssue } from "../src/domain/sample";
import { newStory, type Issue } from "../src/domain/issue";
import { dragStoryItem } from "./helpers/stories-drag";
function fixture() {
  const issue = structuredClone(sampleIssue);
  issue.sections[0].stories.push({
    ...newStory(),
    title: "Saved hidden story",
    enabled: false,
    blocks: [
      { id: "hidden-copy", type: "paragraph", text: "Retained hidden text." },
    ],
  });
  return issue;
}
async function open(page: Page, issue: Issue = fixture()) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript((data) => {
    if (window !== window.top) return;
    if (!localStorage.getItem("ecu-connect:issues:v1"))
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, issue);
  await page.goto("/issues/" + issue.id);
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
}
const panel = (page: Page) =>
  page.getByRole("navigation", { name: "Magazine structure" });
async function save(page: Page) {
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved locally" }),
  ).toBeVisible();
}
async function saved(page: Page) {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0],
  ) as Promise<Issue>;
}

test("minimal story rows and eye toggles preserve hidden content and per-story settings", async ({
  page,
}) => {
  const issue = fixture(),
    section = issue.sections[0],
    first = section.stories[0],
    hidden = section.stories[1];
  await open(page, issue);
  await expect(panel(page).locator(".outline-stories select")).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", {
      name: "Include this story in preview and PDF",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    panel(page).getByRole("button", {
      name: "Hide story: " + first.title,
      exact: true,
    }),
  ).toHaveCSS("opacity", "1");
  await panel(page)
    .getByRole("button", { name: hidden.title, exact: true })
    .click();
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(
    hidden.title,
  );
  await expect(
    panel(page).locator(`[data-story-row="${hidden.id}"] .outline-story`),
  ).toHaveCSS("opacity", "0.48");
  await panel(page)
    .locator(`[data-section-id="${section.id}"] .outline-row`)
    .hover();
  await panel(page)
    .getByRole("button", { name: "Hide section: " + section.name, exact: true })
    .click();
  await save(page);
  let data = await saved(page);
  expect(data.sections[0].enabled).toBe(false);
  expect(data.sections[0].stories.map((s) => s.enabled)).toEqual([true, false]);
  expect(data.sections[0].stories[1].blocks).toEqual(hidden.blocks);
  const frame = page.frameLocator("iframe");
  await expect(frame.locator(`.page[data-story-id="${first.id}"]`)).toHaveCount(
    0,
  );
  await expect(
    frame.locator(".toc-story-title").filter({ hasText: first.title }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    panel(page).getByRole("button", {
      name: "Show section: " + section.name,
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "false");
  await panel(page)
    .locator(`[data-section-id="${section.id}"] .outline-row`)
    .hover();
  await panel(page)
    .getByRole("button", { name: "Show section: " + section.name, exact: true })
    .click();
  await save(page);
  data = await saved(page);
  expect(data.sections[0].stories.map((s) => s.enabled)).toEqual([true, false]);
  await expect(frame.locator(`.page[data-story-id="${first.id}"]`)).toHaveCount(
    1,
  );
  await expect(
    frame.locator(`.page[data-story-id="${hidden.id}"]`),
  ).toHaveCount(0);
  await panel(page)
    .locator(`[data-story-row="${hidden.id}"] .story-line`)
    .hover();
  await panel(page)
    .getByRole("button", { name: "Show story: " + hidden.title, exact: true })
    .click();
  await expect(
    frame.locator(`.page[data-story-id="${hidden.id}"]`),
  ).toHaveCount(1);
  await save(page);
  await page.reload();
  await expect(
    panel(page).getByRole("button", {
      name: "Hide story: " + hidden.title,
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "test-results/stories-visibility.png" });
});

test("visibility filters preview, contents, sequential folios and the actual exported PDF", async ({
  page,
  request,
}) => {
  const issue = fixture(),
    [a, b] = issue.sections,
    hidden = a.stories[1];
  await open(page, issue);
  await panel(page)
    .getByRole("button", {
      name: "Hide story: " + a.stories[0].title,
      exact: true,
    })
    .click();
  await panel(page).locator(`[data-section-id="${b.id}"] .outline-row`).hover();
  await panel(page)
    .getByRole("button", { name: "Hide section: " + b.name, exact: true })
    .click();
  await save(page);
  const data = await saved(page),
    visible = data.sections
      .filter((s) => s.enabled)
      .flatMap((s) => s.stories.filter((story) => story.enabled));
  const frame = page.frameLocator("iframe");
  await expect(frame.locator(".toc-story-title")).toHaveText(
    visible.map((story) => story.title),
  );
  await expect(
    frame.locator('.page[data-kind="article"] .page-number'),
  ).toHaveText(visible.map((_, i) => String(i + 1)));
  await expect(
    frame.locator(`.page[data-story-id="${hidden.id}"]`),
  ).toHaveCount(0);
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  const response = await request.post("/api/export", { data });
  expect(response.ok()).toBe(true);
  const pdf = await response.body();
  expect(
    (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length,
  ).toBe(visible.length + 2);
  const filtered = {
    ...data,
    sections: data.sections
      .filter((s) => s.enabled)
      .map((s) => ({
        ...s,
        stories: s.stories.filter((story) => story.enabled),
      })),
  };
  const expected = await request.post("/api/export", { data: filtered });
  expect(expected.ok()).toBe(true);
  const normalize = (bytes: Buffer) =>
    bytes
      .toString("latin1")
      .replace(/D:\d{14}(?:Z|[+-]\d{2}'\d{2}')/g, "D:00000000000000Z");
  expect(normalize(pdf)).toBe(normalize(await expected.body()));
  expect(data.sections[0].stories).toHaveLength(2);
  expect(data.sections[1].stories[0].enabled).toBe(true);
});

test("handle-only dragging stays vertically anchored, preserves expansion and supports cross-section insertion", async ({
  page,
}) => {
  const issue = fixture(),
    [a, b] = issue.sections;
  await open(page, issue);
  const nav = panel(page);
  await nav
    .getByRole("button", { name: "Expand " + b.name, exact: true })
    .click();
  const before = await nav.locator(".outline-section").allTextContents();
  const title = nav.getByRole("button", {
    name: a.stories[0].title,
    exact: true,
  });
  const titleBox = (await title.boundingBox())!;
  await page.mouse.move(titleBox.x + 20, titleBox.y + 10);
  await page.mouse.down();
  await page.mouse.move(titleBox.x + 60, titleBox.y + 45, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(".stories-drag-overlay")).toHaveCount(0);
  expect(await nav.locator(".outline-section").allTextContents()).toEqual(
    before,
  );
  const handle = nav.getByRole("button", {
      name: "Drag story: " + a.stories[0].title,
      exact: true,
    }),
    box = (await handle.boundingBox())!;
  const sourceLeft = (await nav
    .locator(`[data-story-row="${a.stories[0].id}"]`)
    .boundingBox())!.x;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 35, box.y + box.height + 12, { steps: 4 });
  await expect(page.locator(".stories-drag-overlay")).toBeVisible();
  const left = (await page.locator(".stories-drag-overlay").boundingBox())!.x;
  expect(left).toBeCloseTo(sourceLeft, 1);
  for (const dx of [80, -10, 55]) {
    await page.mouse.move(box.x + dx, box.y + 65, { steps: 3 });
    expect(
      (await page.locator(".stories-drag-overlay").boundingBox())!.x,
    ).toBeCloseTo(left, 1);
    expect(await nav.locator(".outline-section").allTextContents()).toEqual(
      before,
    );
  }
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator(".stories-drag-overlay")).toHaveCount(0);
  await dragStoryItem(
    page,
    nav.getByRole("button", {
      name: "Drag story: " + a.stories[1].title,
      exact: true,
    }),
    nav.locator(`[data-story-row="${a.stories[0].id}"]`),
    "before",
  );
  await expect(
    nav.locator(`[data-section-id="${a.id}"] .outline-story`).first(),
  ).toHaveText(a.stories[1].title);
  await dragStoryItem(
    page,
    nav.getByRole("button", {
      name: "Drag story: " + a.stories[0].title,
      exact: true,
    }),
    nav.locator(`[data-story-row="${b.stories[0].id}"]`),
    "before",
  );
  await expect(
    nav.locator(`[data-section-id="${b.id}"] .outline-story`).first(),
  ).toHaveText(a.stories[0].title);
  await expect(
    nav.getByRole("button", { name: "Collapse " + a.name, exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    nav.getByRole("button", { name: "Collapse " + b.name, exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await dragStoryItem(
    page,
    nav.getByRole("button", { name: "Drag section: " + b.name, exact: true }),
    nav.locator(`[data-section-id="${a.id}"] .outline-row`),
    "before",
  );
  await expect(nav.locator(".outline-section").first()).toContainText(b.name);
  await save(page);
  const data = await saved(page);
  expect(data.sections[0].id).toBe(b.id);
  expect(data.sections[0].stories[0].id).toBe(a.stories[0].id);
  await page.reload();
  await expect(nav.locator(".outline-section").first()).toContainText(b.name);
});

test("drag auto-scrolls only Stories and cancelled moves retain order; keyboard moves use the same slots", async ({
  page,
}) => {
  const issue = fixture();
  await open(page, issue);
  await page.setViewportSize({ width: 1600, height: 650 });
  const nav = panel(page),
    source = issue.sections[0].stories[0];
  const handle = nav.getByRole("button", {
      name: "Drag story: " + source.title,
      exact: true,
    }),
    from = (await handle.boundingBox())!,
    scroll = page.locator(".workspace-stories"),
    bounds = (await scroll.boundingBox())!;
  const original = await nav.locator(".outline-section").allTextContents();
  const editorScroll = await page
    .locator(".workspace-editor")
    .evaluate((el) => el.scrollTop);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 70, bounds.y + bounds.height - 6, {
    steps: 12,
  });
  await expect
    .poll(() => scroll.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(20);
  expect(
    await page.locator(".workspace-editor").evaluate((el) => el.scrollTop),
  ).toBe(editorScroll);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(await nav.locator(".outline-section").allTextContents()).toEqual(
    original,
  );
  await scroll.evaluate((el) => (el.scrollTop = 0));
  const sectionHandle = nav.getByRole("button", {
    name: "Drag section: " + issue.sections[0].name,
    exact: true,
  });
  await sectionHandle.focus();
  await sectionHandle.press("Space");
  await expect(page.locator(".stories-insertion-indicator")).toBeVisible();
  await sectionHandle.press("ArrowDown");
  await sectionHandle.press("Space");
  await expect(nav.locator(".outline-section").first()).toContainText(
    issue.sections[1].name,
  );
  await save(page);
});
