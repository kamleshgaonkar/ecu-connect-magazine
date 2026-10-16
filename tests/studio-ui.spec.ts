import { test, expect } from "@playwright/test";
import { sampleIssue } from "../src/domain/sample";
async function seed(page: import("@playwright/test").Page) {
  await page.addInitScript((data) => {
    if (!localStorage.getItem("ecu-connect:issues:v1"))
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, sampleIssue);
}
test("Page Templates navigation shows real references and honest availability", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Page Templates", exact: true }).click();
  await expect(page).toHaveURL(/\/templates$/);
  await expect(
    page.getByRole("link", { name: "Page Templates", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".layout-card")).toHaveCount(17);
  await expect(
    page.getByRole("button", { name: /Use This Layout:/ }),
  ).toHaveCount(4);
  const cover = page.locator('[data-layout="t01"]');
  await expect(cover).toContainText("Volume 20, page 1");
  await expect(cover.locator("img")).toHaveAttribute(
    "src",
    "/template-thumbnails/t01.webp",
  );
  await expect(cover.locator("img")).toHaveCSS("object-fit", "contain");
  await page.getByRole("button", { name: "Coming soon", exact: true }).click();
  await expect(page.locator(".layout-card")).toHaveCount(13);
  await expect(
    page.getByRole("button", { name: /Use This Layout:/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Available", exact: true }).click();
  await expect(page.locator(".layout-card")).toHaveCount(4);
  await page.getByLabel("Search page templates").fill("Article continuation");
  await expect(page.locator(".layout-card")).toHaveCount(1);
  await expect(page.locator(".layout-card")).toContainText(
    "Article continuation",
  );
  await expect(page.locator("main")).not.toContainText(/\bT0[1-9]\b/);
});
test("Use This Layout applies and saves to a chosen story without changing its content", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/templates");
  await page
    .getByRole("button", {
      name: "Use This Layout: Article continuation",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText("not yet available");
  await page.getByRole("button", { name: "Apply Layout", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Unsaved changes" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Headline", { exact: true }).first(),
  ).toHaveValue(sampleIssue.sections[0].stories[0].title);
  expect(await page.evaluate(() => location.search)).toBe("");
  const savedBefore = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0],
  );
  expect(savedBefore.sections[0].stories[0].template).toBe(
    sampleIssue.sections[0].stories[0].template,
  );
  await page.getByText("Story Design", { exact: true }).first().click();
  await expect(
    page.getByRole("combobox", { name: "Story Layout", exact: true }).first(),
  ).toHaveValue("t04");
  await expect(page.locator(".workspace-editor")).not.toContainText(
    /\bT0[1-9]\b/,
  );
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved locally" }),
  ).toBeVisible();
  await page.reload();
  await page.getByText("Story Design", { exact: true }).first().click();
  await expect(
    page.getByRole("combobox", { name: "Story Layout", exact: true }).first(),
  ).toHaveValue("t04");
  const savedAfter = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0],
  );
  expect(savedAfter.sections[0].stories[0].blocks).toEqual(
    sampleIssue.sections[0].stories[0].blocks,
  );
  expect(savedAfter.sections[0].stories[0].media).toEqual(
    sampleIssue.sections[0].stories[0].media,
  );
});
test("Cover and Contents actions open existing settings without editing a magazine", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/templates");
  for (const [name, selector] of [
    ["Cover", "#cover-design"],
    ["Contents", '[id^="story-images-"]'],
  ] as const) {
    await page
      .getByRole("button", { name: "Use This Layout: " + name, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open Settings", exact: true })
      .click();
    await expect(page.locator(selector).first()).toHaveAttribute("open", "");
    await expect(
      page.getByRole("button", { name: "Save Magazine", exact: true }),
    ).toBeDisabled();
    await page.getByRole("link", { name: "ECU Connect", exact: true }).click();
    await page
      .getByRole("link", { name: "Page Templates", exact: true })
      .click();
  }
});
test("unsaved work is protected when returning to the dashboard", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/issues/" + sampleIssue.id);
  const field = page.getByLabel("Headline", { exact: true }).first();
  await field.fill("An unsaved studio headline");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "ECU Connect", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/issues/" + sampleIssue.id + "$"));
  await expect(field).toHaveValue("An unsaved studio headline");
});
test("desktop controls are monochrome while the live magazine keeps its original colors", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await seed(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Magazines", exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(
    page.getByRole("button", { name: "Create Magazine", exact: true }).first(),
  ).toHaveCSS("background-color", "rgb(17, 17, 17)");
  await page.screenshot({ path: "test-results/studio-dashboard-desktop.png" });
  await page.getByRole("link", { name: "Page Templates", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Page Templates", exact: true }),
  ).toBeVisible();
  await page
    .locator(".layout-thumbnail img")
    .evaluateAll((images) =>
      images.forEach(
        (image) => ((image as HTMLImageElement).loading = "eager"),
      ),
    );
  await expect
    .poll(() =>
      page
        .locator(".layout-thumbnail img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/studio-templates-desktop.png",
    fullPage: true,
  });
  await page.goto("/issues/" + sampleIssue.id);
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  await expect(page.locator(".workspace-preview")).toHaveCSS(
    "background-color",
    "rgb(245, 245, 245)",
  );
  await expect(page.frameLocator("iframe").locator(".cover-brand")).toHaveCSS(
    "color",
    "rgb(3, 78, 162)",
  );
  await expect(
    page.getByRole("button", { name: "Save Magazine", exact: true }),
  ).toHaveCSS("background-color", "rgb(17, 17, 17)");
  await page.getByLabel("Headline", { exact: true }).first().focus();
  await page.screenshot({ path: "test-results/studio-editor-desktop.png" });
});
test("tablet and mobile navigation, gallery and split editor remain usable", async ({
  page,
}) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Page Templates", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Page Templates", exact: true }).click();
  await page.getByRole("button", { name: "Available", exact: true }).click();
  await page.screenshot({ path: "test-results/studio-templates-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/issues/" + sampleIssue.id);
  await page
    .getByRole("tab", { name: "Preview & export", exact: true })
    .click();
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  await page.screenshot({ path: "test-results/studio-editor-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 900, height: 1000 });
  await expect(page.locator(".workspace-editor")).toBeVisible();
  await expect(page.locator(".workspace-preview")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/studio-editor-tablet.png" });
});
