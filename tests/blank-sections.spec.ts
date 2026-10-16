import { test, expect, type Page } from "@playwright/test";
import { sampleIssue } from "../src/domain/sample";
import {
  newIssue,
  newSection,
  sectionNames,
  type Issue,
} from "../src/domain/issue";
import { magazineDocument } from "../src/magazine/document";
async function ready(page: Page) {
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
}
async function open(page: Page, issue: Issue) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript((data) => {
    if (window === window.top && !localStorage.getItem("ecu-connect:issues:v1"))
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, issue);
  await page.goto("/issues/" + issue.id);
  await ready(page);
}
async function add(page: Page, type: string) {
  const outline = page.getByRole("navigation", { name: "Magazine structure" });
  await outline.getByLabel("New section type").selectOption(type);
  await outline
    .getByRole("button", { name: "Add section", exact: true })
    .click();
  await ready(page);
}
async function saved(page: Page): Promise<Issue> {
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
test("Add Section generates only its opening page, saves/reloads and exports without blank continuations", async ({
  page,
  request,
}) => {
  const issue = newIssue("Blank page verification", 21);
  issue.date = "October 12, 2026";
  await open(page, issue);
  await add(page, "Cover Story");
  const frame = page.frameLocator("iframe");
  await expect(frame.locator(".blank-section-page")).toHaveCount(1);
  await expect(frame.locator(".blank-section-page .page-body")).toHaveText([
    "",
  ]);
  await expect(
    frame.locator(
      ".blank-section-page img,.blank-section-page .media-placeholder,.blank-section-page .story-title,.blank-section-page .text-block",
    ),
  ).toHaveCount(0);
  await expect(
    frame.locator(".blank-opening-white .blank-section-number"),
  ).toHaveText("01");
  await expect(frame.locator(".blank-section-page .section-header")).toHaveText(
    ["Cover Story"],
  );
  await expect(frame.locator(".blank-section-page .page-number")).toHaveText([
    "1",
  ]);
  await expect(
    page.getByRole("textbox", { name: "Headline", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("textbox", { name: "Subheadline", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("textbox", { name: "Author", exact: true }),
  ).toHaveValue("");
  await add(page, "What's Up @ ECU Worldwide");
  await expect(frame.locator(".blank-section-page")).toHaveCount(2);
  await expect(
    frame.locator(".blank-opening-split .blank-section-number"),
  ).toHaveText("02");
  const stored = await saved(page);
  expect(stored.sections.map((s) => s.stories.length)).toEqual([1, 1]);
  expect(
    stored.sections
      .flatMap((s) => s.stories)
      .every(
        (s) =>
          s.title === "" &&
          s.subtitle === "" &&
          s.byline === "" &&
          s.blocks.length === 0 &&
          s.media.length === 0,
      ),
  ).toBe(true);
  await page.reload();
  await ready(page);
  await expect(frame.locator(".blank-section-page")).toHaveCount(2);
  await expect(frame.locator(".blank-section-page .page-number")).toHaveText([
    "1",
    "2",
  ]);
  await expect(frame.locator(".contents .toc-story-title")).toHaveCount(0);
  await expect(frame.locator(".contents .toc-section-number")).toHaveText([
    "01",
    "02",
  ]);
  await expect(frame.locator(".blank-continuation")).toHaveCount(0);
  const fullscreen = page.getByRole("button", {
    name: "Open full-screen preview",
    exact: true,
  });
  await fullscreen.focus();
  await fullscreen.press("Enter");
  await expect(frame.locator("#page-thumbnails button")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Close full-screen preview", exact: true })
    .press("Enter");
  const response = await request.post("/api/export", { data: stored });
  expect(response.status()).toBe(200);
  const pdf = await response.body();
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(
    (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length,
  ).toBe(4);
});
test("section names, numbering, volume and folios update while existing section data is retained", async ({
  page,
}) => {
  const issue = structuredClone(sampleIssue);
  const legacy = structuredClone(issue.sections);
  await open(page, issue);
  await add(page, "Notice Board");
  const frame = page.frameLocator("iframe");
  const outline = page.getByRole("navigation", { name: "Magazine structure" });
  const newIndex = issue.sections.length;
  await outline.locator(".outline-section").nth(newIndex).click();
  await page
    .getByLabel("Section name", { exact: true })
    .fill("Updated blank section");
  await outline
    .getByRole("button", { name: "Move Updated blank section up", exact: true })
    .click();
  await ready(page);
  await expect(frame.locator(".blank-section-page .section-header")).toHaveText(
    ["Updated blank section"],
  );
  await expect(frame.locator(".blank-section-number")).toHaveText(
    String(newIndex).padStart(2, "0"),
  );
  await outline.getByRole("button", { name: /^Magazine Details/ }).click();
  await page.getByLabel("Volume", { exact: true }).fill("22");
  await page
    .getByLabel("Publication date", { exact: true })
    .fill("November 2026");
  await ready(page);
  await expect(
    frame.locator(".blank-section-page .footer-label"),
  ).toContainText(["VOL. 22 | November 2026"]);
  const stored = await saved(page);
  expect(
    stored.sections.filter((s) => legacy.some((old) => old.id === s.id)),
  ).toEqual(legacy);
});
test("all seven section styles generate one A4 opening each without placeholders", async ({
  page,
}) => {
  const issue = newIssue("All blank sections", 21);
  issue.sections = sectionNames.map(newSection);
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  await expect(page.locator(".blank-section-page")).toHaveCount(7);
  await expect(page.locator(".blank-opening-white")).toHaveCount(6);
  await expect(page.locator(".blank-opening-split")).toHaveCount(1);
  await expect(page.locator(".blank-continuation")).toHaveCount(0);
  await expect(page.locator(".blank-section-number")).toHaveText([
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
  ]);
  expect(
    await page.locator(".blank-section-page .page-body").allTextContents(),
  ).toEqual(Array(7).fill(""));
  const labelLines = await page
    .locator(".blank-opening-split .section-header")
    .evaluate(
      (node) =>
        node.getBoundingClientRect().height /
        parseFloat(getComputedStyle(node).lineHeight),
    );
  expect(labelLines).toBeCloseTo(2, 1);
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  const dimensions = await page
    .locator(".blank-section-page")
    .first()
    .boundingBox();
  expect(dimensions!.width).toBeCloseTo((210 * 96) / 25.4, 0);
  expect(dimensions!.height).toBeCloseTo((297 * 96) / 25.4, 0);
});
