import { test, expect, type Page } from "@playwright/test";
import { sampleIssue } from "../src/domain/sample";

async function seed(page: Page) {
  await page.addInitScript((data) => {
    if (window !== window.top) return;
    if (!localStorage.getItem("ecu-connect:issues:v1"))
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, sampleIssue);
}
const outline = (page: Page) =>
  page.getByRole("navigation", { name: "Magazine structure" });
const sectionButton = (page: Page, index: number) =>
  outline(page).locator(".outline-section").nth(index);

test("master-detail navigation shows one form at a time and reveals a section's stories", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/issues/" + sampleIssue.id);
  const first = sampleIssue.sections[0];
  const second = sampleIssue.sections[1];
  await expect(page.getByLabel("Headline", { exact: true })).toHaveCount(1);
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(
    first.stories[0].title,
  );
  await expect(page.getByLabel("Magazine title", { exact: true })).toHaveCount(
    0,
  );
  await expect(sectionButton(page, 0)).toHaveAttribute("aria-expanded", "true");
  await expect(
    outline(page).getByRole("button", {
      name: second.stories[0].title,
      exact: true,
    }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: /^Magazine Details/ }).click();
  await expect(page.getByLabel("Magazine title", { exact: true })).toHaveValue(
    sampleIssue.title,
  );
  await expect(page.getByLabel("Headline", { exact: true })).toHaveCount(0);

  await sectionButton(page, 1).click();
  await expect(
    page.getByRole("heading", { name: "Section Details", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Section name", { exact: true })).toHaveValue(
    second.name,
  );
  await expect(sectionButton(page, 1)).toHaveAttribute("aria-expanded", "true");
  await expect(sectionButton(page, 0)).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  const storyLink = outline(page).getByRole("button", {
    name: second.stories[0].title,
    exact: true,
  });
  await expect(storyLink).toBeVisible();
  await storyLink.click();
  await expect(storyLink).toHaveAttribute("aria-current", "true");
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(
    second.stories[0].title,
  );
  await expect(
    page.getByRole("navigation", { name: "Story location" }),
  ).toContainText(second.name);
});

test("editing a selected story updates the live preview and navigates to its page", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/issues/" + sampleIssue.id);
  await expect(page.getByText("Layout checked.")).toBeVisible();
  await sectionButton(page, 1).click();
  await outline(page)
    .getByRole("button", {
      name: sampleIssue.sections[1].stories[0].title,
      exact: true,
    })
    .click();
  const frame = page.frameLocator("iframe");
  const physical = await frame
    .locator(`[data-story-id="${sampleIssue.sections[1].stories[0].id}"]`)
    .first()
    .getAttribute("data-physical-page");
  await expect(page.getByLabel("Preview page", { exact: true })).toHaveValue(
    physical!,
  );
  await page
    .getByLabel("Headline", { exact: true })
    .fill("A live master-detail headline");
  await page
    .getByRole("textbox", { name: "Block 1 text", exact: true })
    .fill("Edited from the redesigned story editor.");
  await expect(
    frame.getByRole("heading", {
      name: "A live master-detail headline",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    frame
      .locator(".text-block")
      .filter({ hasText: "Edited from the redesigned story editor." }),
  ).toBeVisible();
  await expect(
    outline(page).getByRole("button", {
      name: "A live master-detail headline",
      exact: true,
    }),
  ).toBeVisible();
});

test("unsaved drafts survive switching views and persist after Save Magazine", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/issues/" + sampleIssue.id);
  await page.getByLabel("Headline", { exact: true }).fill("Draft headline");
  const intro = page.getByRole("textbox", {
    name: "Introduction",
    exact: true,
  });
  await intro.fill("Draft intro");
  await page.getByRole("button", { name: /^Magazine Details/ }).click();
  await page.getByLabel("Publication date", { exact: true }).fill("Nov 2026");
  await sectionButton(page, 0).click();
  await outline(page)
    .getByRole("button", { name: "Draft headline", exact: true })
    .click();
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(
    "Draft headline",
  );
  await expect(intro).toHaveValue("Draft intro");
  await expect(
    page.getByRole("status").filter({ hasText: "Unsaved changes" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save Magazine", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved locally" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(
    "Draft headline",
  );
  await page.getByRole("button", { name: /^Magazine Details/ }).click();
  await expect(
    page.getByLabel("Publication date", { exact: true }),
  ).toHaveValue("Nov 2026");
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0],
  );
  expect(saved.sections[0].stories[0].blocks).toEqual(
    sampleIssue.sections[0].stories[0].blocks,
  );
});

test("technical pagination options live in a collapsed Advanced Layout section", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/issues/" + sampleIssue.id);
  const breakSelect = page.getByLabel("Block 1 break before", { exact: true });
  await expect(breakSelect).toBeHidden();
  await expect(
    page.getByRole("combobox", { name: "Opening Page Layout", exact: true }),
  ).toBeHidden();
  await page.getByText("Advanced Layout", { exact: true }).click();
  await expect(breakSelect).toBeVisible();
  await breakSelect.selectOption("page");
  await expect(breakSelect).toHaveValue("page");
  await expect(
    page.getByRole("combobox", { name: "Article Columns", exact: true }),
  ).toBeVisible();
  for (const type of [
    "paragraph",
    "heading",
    "quote",
    "list",
    "figure",
    "callout",
  ])
    await expect(
      page
        .getByRole("combobox", { name: "Block 1 type", exact: true })
        .locator(`option[value="${type}"]`),
    ).toHaveCount(1);
});

test("Review issues collects notes while the layout status stays visible", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/issues/" + sampleIssue.id);
  await expect(page.getByText("Layout checked.")).toBeVisible();
  const review = page.getByText(/^Review issues/);
  await expect(review).toBeVisible();
  await expect(page.getByText(/Demonstration content only/)).toBeHidden();
  await review.click();
  await expect(page.getByText(/Demonstration content only/)).toBeVisible();
});

test("template filters, selection and Apply Layout open the chosen story", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/templates");
  const available = page.getByRole("button", { name: "Available", exact: true });
  await available.click();
  await expect(available).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".layout-card.is-available")).toHaveCount(4);
  await expect(page.locator(".layout-card.is-soon")).toHaveCount(0);
  await page.getByRole("button", { name: "Coming soon", exact: true }).click();
  await expect(page.locator(".layout-card.is-soon")).toHaveCount(13);
  await expect(page.locator(".is-soon .layout-unavailable").first()).toHaveText(
    "Reference only for now",
  );
  await page.getByRole("button", { name: "All layouts", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Use This Layout: Article continuation",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".chosen-layout img")).toHaveAttribute(
    "src",
    "/template-thumbnails/t04.webp",
  );
  const target = sampleIssue.sections[1].stories[0];
  await dialog
    .getByLabel("Choose story")
    .selectOption({ label: sampleIssue.sections[1].name + " · " + target.title });
  await dialog.getByRole("button", { name: "Apply Layout", exact: true }).click();
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(
    target.title,
  );
  await page.getByText("Story Design", { exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Story Layout", exact: true }),
  ).toHaveValue("t04");
});

test("responsive layouts keep the outline usable without horizontal overflow", async ({
  page,
}) => {
  await seed(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/issues/" + sampleIssue.id);
  const nav = await outline(page).boundingBox();
  const detail = await page.locator(".editor-detail").boundingBox();
  expect(detail!.x).toBeGreaterThan(nav!.x + nav!.width);
  for (const size of [
    { width: 900, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    const stackedNav = await outline(page).boundingBox();
    const stackedDetail = await page.locator(".editor-detail").boundingBox();
    expect(stackedDetail!.y).toBeGreaterThan(stackedNav!.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.getByLabel("Headline", { exact: true })).toBeVisible();
  }
  await page.screenshot({ path: "test-results/editor-ux-mobile.png" });
});

test("Poppins is the loaded interface font while magazine pages keep their own fonts", async ({
  page,
}) => {
  await seed(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".cover-thumbnail iframe").first()).toBeVisible();
  await expect(page.frameLocator(".cover-thumbnail iframe").first().locator(".page").first()).toHaveCSS("zoom", /0\.2/);
  await page.screenshot({ path: "test-results/editor-ux-dashboard.png" });
  await page.getByRole("link", { name: /Connections that move us/ }).click();
  await expect(page.getByText("Layout checked.")).toBeVisible();
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    const family = (selector: string) =>
      getComputedStyle(document.querySelector(selector)!).fontFamily;
    return {
      loaded: [...document.fonts]
        .filter((font) => font.status === "loaded")
        .map((font) => font.family.replace(/["']/g, "") + " " + font.weight),
      body: family("body"),
      nav: family(".sidebar nav a"),
      heading: family("h1"),
      button: family(".button.primary"),
      label: family(".title-field"),
      input: family(".title-field input"),
      toolbar: family(".preview-toolbar"),
    };
  });
  for (const weight of ["400", "500", "600", "700"])
    expect(fonts.loaded.some((f) => /poppins/i.test(f) && f.endsWith(weight)))
      .toBe(true);
  for (const value of [
    fonts.body,
    fonts.nav,
    fonts.heading,
    fonts.button,
    fonts.label,
    fonts.input,
    fonts.toolbar,
  ])
    expect(value.split(",")[0].replace(/["']/g, "").trim()).toMatch(
      /poppins/i,
    );
  const magazineFont = await page
    .frameLocator("iframe")
    .locator(".page")
    .first()
    .evaluate((element) => getComputedStyle(element).fontFamily);
  expect(magazineFont.split(",")[0].replace(/["']/g, "")).toBe("ECU Poppins");
  expect(magazineFont).not.toContain(fonts.body.split(",")[0]);
  await page.screenshot({ path: "test-results/editor-ux-editor.png" });
});

test("dashboard cards prioritize volume and open by keyboard at responsive widths", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page);
  await page.goto("/");
  const card = page.locator(".issue-card").first();
  await expect(card.locator(".studio-volume-label")).toHaveText("VOLUME");
  await expect(card.locator(".volume-number")).toHaveText(String(sampleIssue.volume));
  await expect(card.locator(".publication-date")).toHaveText(sampleIssue.date);
  await expect(card).toContainText("Draft");
  await expect(card).toContainText("sections");
  await expect(card).toContainText("Open Magazine");
  const cover = card.frameLocator("iframe");
  await expect(cover.locator(".page").first()).toBeVisible();
  await expect(cover.locator(".page").first()).toHaveCSS("zoom", /0\.2/);
  for (const width of [1600, 900, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(card).toBeVisible();
  }
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp("/issues/" + sampleIssue.id + "$"));
  await page.setViewportSize({ width: 1600, height: 1000 });
  await expect(page.getByText("Layout checked.")).toBeVisible();
  await page.goto("/templates");
  await expect(page.locator(".layout-card")).toHaveCount(17);
  expect(errors).toEqual([]);
});
