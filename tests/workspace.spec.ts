import { test, expect, type Page } from "@playwright/test";
import { dragStoryItem } from "./helpers/stories-drag";
import { sampleIssue } from "../src/domain/sample";
async function open(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  await page.getByRole("link", { name: /Connections that move us/ }).click();
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
}
test("three columns resize, fit a complete A4 page and preserve editor scroll", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator(".sidebar")).toHaveCount(0);
  const box = await page.locator(".three-column-workspace").boundingBox();
  for (const [selector, ratio] of [
    [".workspace-stories", 0.23],
    [".workspace-editor", 0.42],
    [".workspace-preview", 0.35],
  ] as const) {
    const panel = await page.locator(selector).boundingBox();
    expect(panel!.width / box!.width).toBeCloseTo(ratio, 1);
  }
  const resize = page.getByRole("separator", {
    name: "Resize stories and editor",
  });
  await resize.focus();
  await resize.press("ArrowRight");
  await expect(resize).toHaveAttribute("aria-valuenow", "25");
  const frame = page.frameLocator("iframe");
  const dimensions = await frame
    .locator(".page[data-physical-page='3']")
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        width: r.width,
        height: r.height,
        availableWidth: innerWidth,
        availableHeight: innerHeight,
      };
    });
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.availableWidth);
  expect(dimensions.height).toBeLessThanOrEqual(dimensions.availableHeight);
  expect(dimensions.width / dimensions.height).toBeCloseTo(210 / 297, 3);
  await page
    .locator(".workspace-editor")
    .evaluate((el) => (el.scrollTop = 300));
  const scroll = await page
    .locator(".workspace-editor")
    .evaluate((el) => el.scrollTop);
  // Keyboard activation avoids racing the hover-only toolbar's fade/scroll behavior.
  const fullscreen = page.getByRole("button", {
    name: "Open full-screen preview",
  });
  await fullscreen.focus();
  await fullscreen.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Full-screen magazine preview" }),
  ).toBeVisible();
  const count = Number(
    (await page.locator(".preview-page-total").textContent())!.replace(
      /\D/g,
      "",
    ),
  );
  await expect(frame.locator("#page-thumbnails button")).toHaveCount(count);
  await frame
    .getByRole("button", { name: "Go to page 2", exact: true })
    .click();
  await expect(page.getByLabel("Preview page", { exact: true })).toHaveValue(
    "2",
  );
  await expect(
    frame.getByRole("button", { name: "Go to page 2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Close full-screen preview" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Preview page", { exact: true })).toHaveValue(
    "3",
  );
  await page.screenshot({ path: "test-results/workspace-fullscreen.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.locator(".workspace-editor").evaluate((el) => el.scrollTop),
  ).toBe(scroll);
  await expect(frame.locator("#page-thumbnails")).toBeHidden();
  await page.screenshot({ path: "test-results/workspace-desktop.png" });
});
test("drag sections and stories, move between sections, save and update contents", async ({
  page,
}) => {
  await open(page);
  const a = sampleIssue.sections[0],
    b = sampleIssue.sections[1];
  const nav = page.getByRole("navigation", { name: "Magazine structure" });
  await dragStoryItem(
    page,
    nav.getByRole("button", { name: "Drag section: " + a.name, exact: true }),
    nav.locator(`[data-section-id="${b.id}"] .outline-row`),
  );
  await expect(nav.locator(".outline-section").first()).toContainText(b.name);
  await nav
    .getByRole("button", { name: b.name + " (1)", exact: true })
    .click();
  const story = a.stories[0];
  await nav.getByRole("button", { name: a.name + " (1)", exact: true }).click();
  await dragStoryItem(
    page,
    nav.getByRole("button", {
      name: "Drag story: " + story.title,
      exact: true,
    }),
    nav.locator(`[data-section-id="${b.id}"] .outline-row`),
  );
  await nav.locator(`[data-section-id="${b.id}"] .outline-section`).click();
  await expect(
    nav.locator(`[data-section-id="${b.id}"] .outline-story`),
  ).toHaveCount(2);
  await dragStoryItem(
    page,
    nav.getByRole("button", {
      name: "Drag story: " + story.title,
      exact: true,
    }),
    nav.locator(`[data-story-id="${b.stories[0].id}"]`),
    "before",
  );
  await expect(
    nav.locator(`[data-section-id="${b.id}"] .outline-story`).first(),
  ).toContainText(story.title);
  await nav.getByRole("button", { name: story.title, exact: true }).click();
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(
    story.title,
  );
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved locally" }),
  ).toBeVisible();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0],
  );
  expect(saved.sections[0].id).toBe(b.id);
  expect(saved.sections[0].stories[0]).toEqual(story);
  const frame = page.frameLocator("iframe");
  await expect(frame.locator(".toc-story-title").first()).toContainText(
    story.title,
  );
  await page.reload();
  await expect(nav.locator(".outline-section").first()).toContainText(b.name);
});

test("desktop resolutions retain the top bar and keyboard thumbnails stay usable", async ({
  page,
}) => {
  await open(page);
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
    { width: 900, height: 1000 },
  ]) {
    await page.setViewportSize(size);
    await expect(
      page.getByRole("link", { name: "ECU Connect", exact: true }),
    ).toBeInViewport();
    expect(await page.evaluate(() => scrollY)).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const frame = page.frameLocator("iframe");
  // Keyboard activation avoids racing the hover-only toolbar's fade/scroll behavior.
  const fullscreen = page.getByRole("button", {
    name: "Open full-screen preview",
  });
  await fullscreen.focus();
  await fullscreen.press("Enter");
  const thumbnail = frame.getByRole("button", {
    name: "Go to page 2",
    exact: true,
  });
  await thumbnail.click();
  await thumbnail.press("ArrowRight");
  await expect(page.getByLabel("Preview page", { exact: true })).toHaveValue(
    "3",
  );
  await thumbnail.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open full-screen preview" }),
  ).toBeFocused();
  await page.screenshot({ path: "test-results/workspace-tablet.png" });
});
