import { test, expect } from "@playwright/test";
import { newIssue, newSection } from "../src/domain/issue";

test("Opening fields follow stories, override independently, persist and export", async ({
  page,
  request,
}) => {
  const issue = newIssue("Opening fields test", 21);
  issue.sections = [newSection("What's Up @ ECU Worldwide")];
  const story = issue.sections[0].stories[0];
  Object.assign(story, {
    title: "Original headline",
    subtitle: "Original introduction",
    byline: "Original author",
  });
  await page.addInitScript((data) => {
    if (!localStorage.getItem("ecu-connect:issues:v1"))
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, issue);
  await page.goto("/issues/" + issue.id);
  await page
    .getByRole("button", { name: "Original headline", exact: true })
    .click();
  const frame = page.frameLocator("iframe");
  const opening = frame.locator(".blank-opening-split");
  const ready = async () => {
    await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  };
  await ready();
  await expect(opening.locator(".story-title")).toHaveText("Original headline");
  for (const [label, value, selector] of [
    ["Headline", "Updated headline", ".story-title"],
    ["Subheadline", "Updated introduction", ".subtitle"],
    ["Author", "Updated author", ".byline"],
  ]) {
    await page.getByRole("textbox", { name: label, exact: true }).fill(value);
    await expect(opening.locator(selector)).toHaveText(value);
    await page
      .getByRole("textbox", { name: `${label} on Opening Page`, exact: true })
      .fill(`Override ${label}`);
    await expect(opening.locator(selector)).toHaveText(`Override ${label}`);
    await page
      .getByRole("textbox", { name: label, exact: true })
      .fill(`Index ${label}`);
    await expect(opening.locator(selector)).toHaveText(`Override ${label}`);
  }
  await expect(frame.locator(".contents .toc-story-title")).toHaveText(
    "Index Headline",
  );
  await expect(frame.locator(".blank-continuation .page-body")).toHaveText("");
  await page
    .getByRole("button", { name: "Continuation Page", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", {
      name: "Headline on Opening Page",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Opening Page", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Author on Opening Page", exact: true })
    .fill("");
  await expect(opening.locator(".byline")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved locally" }),
  ).toBeVisible();
  await page.reload();
  await ready();
  await expect(opening.locator(".story-title")).toHaveText("Override Headline");
  await expect(opening.locator(".subtitle")).toHaveText("Override Subheadline");
  await expect(opening.locator(".byline")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Index Headline", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use story author", exact: true })
    .click();
  await expect(opening.locator(".byline")).toHaveText("Index Author");
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0],
  );
  expect(stored.sections[0].stories[0].title).toBe("Index Headline");
  expect(stored.sections[0].stories[0].openingFields.title).toBe(
    "Override Headline",
  );
  const response = await request.post("/api/export", { data: stored });
  expect(response.status()).toBe(200);
  const pdf = await response.body();
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(
    (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length,
  ).toBe(4);
});

test("white opening uses linked fields safely and continuation stays blank", async ({
  page,
}) => {
  const { magazineDocument } = await import("../src/magazine/document");
  const issue = newIssue("White opening", 21);
  issue.sections = [newSection("Cover Story")];
  const story = issue.sections[0].stories[0];
  Object.assign(story, {
    title: "<script>headline</script>",
    subtitle: "Introduction",
    byline: "Author",
  });
  story.openingFields = { subtitle: "" };
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  await expect(page.locator(".blank-opening-white .story-title")).toHaveText(
    story.title,
  );
  await expect(page.locator(".blank-opening-white .subtitle")).toHaveCount(0);
  await expect(page.locator(".blank-opening-white .byline")).toHaveText(
    "Author",
  );
  await expect(page.locator(".blank-continuation .page-body")).toHaveText("");
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
});
