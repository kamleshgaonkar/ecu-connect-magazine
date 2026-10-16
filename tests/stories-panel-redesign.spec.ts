import { test, expect, type Page } from "@playwright/test";
import {
  newIssue,
  newSection,
  newStory,
  id,
  type Issue,
} from "../src/domain/issue";
import { dragStoryItem } from "./helpers/stories-drag";
function fixture(count = 4) {
  const issue = newIssue("Stories panel · demonstration", 21);
  issue.sections = [
    newSection("Cover Story"),
    newSection("What's Up @ ECU Worldwide"),
    newSection("Notice Board"),
  ];
  const section = issue.sections[1];
  section.stories = Array.from({ length: count }, (_, index) => {
    const story = index ? newStory() : section.stories[0];
    story.title =
      [
        "Connections across regions",
        "A conversation with our team",
        "A shared perspective",
        "People behind the journey",
      ][index] ?? `Editorial story ${index + 1}`;
    story.subtitle =
      "Demonstration editorial content — not an ECU announcement.";
    story.contentMode = "continuous";
    story.blocks = Array.from({ length: index === 1 ? 2 : 1 }, (_, page) => ({
      id: id(),
      type: "paragraph" as const,
      text: "Demonstration story content for reviewing the magazine interface. ".repeat(
        3,
      ),
      breakBefore: page ? ("page" as const) : ("auto" as const),
    }));
    return story;
  });
  return issue;
}
async function open(page: Page, issue: Issue) {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.addInitScript((data) => {
    if (window === window.top && !localStorage.getItem("ecu-connect:issues:v1"))
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, issue);
  await page.goto(`/issues/${issue.id}`);
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  await page
    .locator(".stories-panel .outline-section")
    .filter({ hasText: "What's Up @ ECU Worldwide" })
    .click();
  await page
    .getByRole("button", {
      name: issue.sections[1].stories[0].title,
      exact: true,
    })
    .click();
}
async function assertRanges(page: Page) {
  const layout = await page
    .frameLocator("iframe")
    .locator("body")
    .evaluate(() => window.__magazineResult!);
  for (const [storyId, start] of Object.entries(layout.storyPages)) {
    const row = page.locator(`.stories-panel [data-story-row="${storyId}"]`);
    if (!(await row.count())) continue;
    const end = start.folio + layout.storyPageCounts[storyId] - 1;
    await expect(row.locator(".story-row-copy small")).toHaveText(
      start.folio === end
        ? `Page ${start.folio}`
        : `Pages ${start.folio}–${end}`,
    );
    await expect(row.locator(".story-opening-thumbnail")).toHaveCount(1);
  }
}
test("real opening thumbnails, final folios, live content updates and neutral unclipped panel", async ({
  page,
}) => {
  const issue = fixture();
  await open(page, issue);
  const section = issue.sections[1];
  const row = page.locator(`[data-story-row="${section.stories[0].id}"]`);
  await expect(row.locator(".story-opening-thumbnail .page")).toHaveCount(1);
  await expect(row.locator(".story-opening-thumbnail .story-title")).toHaveText(
    section.stories[0].title,
  );
  await assertRanges(page);
  await expect(
    page.locator(`.stories-panel [data-story-id="${section.stories[0].id}"]`),
  ).toHaveCount(1);
  await expect(row.locator(".story-line")).toHaveCSS(
    "background-color",
    "rgb(241, 243, 246)",
  );
  await expect(
    page.locator(
      `.stories-panel [data-section-id="${section.id}"] .outline-section`,
    ),
  ).toContainText("(4)");
  expect(await page.locator("iframe").count()).toBe(1);
  await page
    .getByRole("textbox", { name: "Headline", exact: true })
    .fill("Updated editorial headline");
  await expect(row.locator(".story-opening-thumbnail .story-title")).toHaveText(
    "Updated editorial headline",
  );
  await page
    .getByRole("textbox", { name: "Complete story content" })
    .fill(
      "Demonstration content flows automatically across pages. ".repeat(450),
    );
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  await expect
    .poll(
      async () =>
        (
          await page
            .frameLocator("iframe")
            .locator("body")
            .evaluate(() => window.__magazineResult!)
        ).storyPageCounts[section.stories[0].id],
    )
    .toBeGreaterThan(1);
  await assertRanges(page);
  for (const width of [1600, 1280]) {
    await page.setViewportSize({ width, height: 1100 });
    expect(
      await page
        .locator(".workspace-stories")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    const thumb = await row.locator(".story-opening-thumbnail").boundingBox();
    expect(thumb!.width).toBeCloseTo(65, 0);
    expect(thumb!.width / thumb!.height).toBeCloseTo(210 / 297, 2);
  }
  const resize = page.getByRole("separator", {
    name: "Resize stories and editor",
  });
  await resize.focus();
  await resize.press("Home");
  expect(
    await page
      .locator(".workspace-stories")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await page.locator(".section-create-menu summary").click();
  const bounds = await page.locator(".workspace-stories").boundingBox();
  const menu = await page.locator(".add-section").boundingBox();
  expect(menu!.x).toBeGreaterThanOrEqual(bounds!.x);
  expect(menu!.x + menu!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
  await page.locator(".section-create-menu summary").click();
  await resize.focus();
  await resize.press("ArrowRight");
  await resize.press("ArrowRight");
  await resize.press("ArrowRight");
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.locator(".workspace-stories").evaluate((el) => {
    el.scrollTop = 75;
  });
  await page
    .locator(".workspace-stories")
    .screenshot({ path: "test-results/stories-panel-approved.png" });
});

test("both add-story entries, section picker, visibility, confirmed deletion, reorder and reload", async ({
  page,
}) => {
  const issue = fixture();
  await open(page, issue);
  const section = issue.sections[1];
  const list = page.locator(`.stories-panel [data-section-id="${section.id}"]`);
  await list
    .getByRole("button", { name: "Add story to " + section.name, exact: true })
    .click();
  await expect(list.locator("[data-story-row]")).toHaveCount(5);
  await list.getByRole("button", { name: "Add story", exact: true }).click();
  await expect(list.locator("[data-story-row]")).toHaveCount(6);
  await list
    .getByRole("button", {
      name: "Hide story: " + section.stories[0].title,
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    list.locator(`[data-story-row="${section.stories[0].id}"] small`),
  ).toHaveText("Hidden from magazine");
  await list
    .getByRole("button", {
      name: "Show story: " + section.stories[0].title,
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await list
    .getByRole("button", { name: "Hide section: " + section.name, exact: true })
    .click();
  await expect(list.locator(".story-row-copy small").first()).toHaveText(
    "Hidden from magazine",
  );
  await list
    .getByRole("button", { name: "Show section: " + section.name, exact: true })
    .click();
  await dragStoryItem(
    page,
    list.getByRole("button", {
      name: "Drag story: " + section.stories[0].title,
      exact: true,
    }),
    list.locator(`[data-story-row="${section.stories[1].id}"]`),
    "after",
  );
  await expect(list.locator("[data-story-row]").first()).toHaveAttribute(
    "data-story-row",
    section.stories[1].id,
  );
  await page.locator(".section-create-menu summary").click();
  await page.getByLabel("New section type").selectOption("Special Feature");
  await page.getByRole("button", { name: "Add section", exact: true }).click();
  const remove = page.getByRole("button", {
    name: "Delete section: Special Feature",
    exact: true,
  });
  page.once("dialog", (dialog) => dialog.dismiss());
  await remove.click();
  await expect(remove).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept());
  await remove.click();
  await expect(remove).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await page.reload();
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  await page
    .locator(".stories-panel .outline-section")
    .filter({ hasText: section.name })
    .click();
  await expect(list.locator("[data-story-row]")).toHaveCount(6);
  await expect(list.locator("[data-story-row]").first()).toHaveAttribute(
    "data-story-row",
    section.stories[1].id,
  );
  await assertRanges(page);
});

test("large issue reuses one renderer and mounts only nearby opening thumbnails", async ({
  page,
}) => {
  const issue = fixture(40);
  const started = Date.now();
  await open(page, issue);
  const list = page.locator(
    `.stories-panel [data-section-id="${issue.sections[1].id}"]`,
  );
  await expect(list.locator("[data-story-row]")).toHaveCount(40);
  await expect(
    list.locator(".story-opening-thumbnail .page").first(),
  ).toBeVisible();
  const mounted = await list.locator(".story-opening-thumbnail .page").count();
  expect(mounted).toBeLessThan(20);
  expect(await page.locator("iframe").count()).toBe(1);
  const target = list.locator("[data-story-row]").last();
  await target.scrollIntoViewIfNeeded();
  await expect(target.locator(".story-opening-thumbnail .page")).toBeVisible();
  expect(
    await page
      .locator(".workspace-stories")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  test.info().annotations.push({
    type: "large-issue-load-ms",
    description: String(Date.now() - started),
  });
});
