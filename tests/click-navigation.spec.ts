import { test, expect, type Page } from "@playwright/test";
import { newIssue, newSection, newStory, id } from "../src/domain/issue";
async function open(page: Page) {
  const issue = newIssue("Click navigation", 23);
  issue.sections = [newSection("Cover Story"), newSection("Notice Board")];
  const first = issue.sections[0].stories[0];
  first.title = "Section opening";
  const story = newStory();
  story.title = "Later story";
  story.blocks = [0, 1, 2].map((i) => ({
    id: id(),
    type: "paragraph" as const,
    text: `Page ${i + 1}`,
    breakBefore: i ? ("page" as const) : ("auto" as const),
  }));
  issue.sections[1].stories.push(story);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript((data) => {
    if (!localStorage.getItem("ecu-connect:issues:v1"))
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, issue);
  await page.goto("/issues/" + issue.id);
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  return { issue, first, story };
}
test("only page clicks select stories/pages, expand sections, preserve unsaved edits and stable reflow", async ({
  page,
}) => {
  const { first, story } = await open(page);
  const frame = page.frameLocator("iframe");
  const editor = page.locator(".story-editor");
  await page
    .getByRole("textbox", { name: "Headline", exact: true })
    .fill("Unsaved opening edit");
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: /^Notice Board/ }).click();
  await page
    .getByRole("button", { name: "Collapse Notice Board", exact: true })
    .click();
  const continuation = frame.locator(
    `#pages [data-story-id="${story.id}"][data-story-page="1"]`,
  );
  await continuation.click({ position: { x: 200, y: 160 } });
  await expect(editor).toHaveAttribute("data-story-id", story.id);
  await expect(
    page.getByRole("button", { name: "Collapse Notice Board", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Later story", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await expect(
    page.getByRole("button", { name: "Continuation Page", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(continuation).toHaveAttribute("data-editor-selected", "true");
  await page.getByRole("button", { name: "Opening Page", exact: true }).click();
  await continuation.click({ position: { x: 200, y: 160 } });
  await expect(
    page.getByRole("button", { name: "Continuation Page", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  // A real wheel gesture and programmatic scrolling both change browsing position only.
  await continuation.hover();
  await page.mouse.wheel(0, -1500);
  await frame
    .locator(".page")
    .first()
    .evaluate((el) => el.scrollIntoView());
  await expect(page.getByLabel("Preview page", { exact: true })).toHaveValue(
    "1",
  );
  await expect(editor).toHaveAttribute("data-story-id", story.id);
  await expect(continuation).toHaveAttribute("data-editor-selected", "true");
  await expect(
    page.getByRole("button", { name: "Continuation Page", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  // Navigation dropdown, fullscreen thumbnails and page clicks in fullscreen browse only.
  await page.getByLabel("Preview page", { exact: true }).selectOption("3");
  await expect(editor).toHaveAttribute("data-story-id", story.id);
  const fullscreen = page.getByRole("button", {
    name: "Open full-screen preview",
  });
  await fullscreen.focus();
  await fullscreen.press("Enter");
  await frame
    .getByRole("button", { name: "Go to page 3", exact: true })
    .click();
  await frame
    .locator(`#pages [data-story-id="${first.id}"]`)
    .click({ position: { x: 200, y: 150 } });
  await page.keyboard.press("Escape");
  await expect(editor).toHaveAttribute("data-story-id", story.id);
  await frame
    .locator(`#pages [data-story-id="${first.id}"]`)
    .click({ position: { x: 200, y: 150 } });
  await expect(editor).toHaveAttribute("data-story-id", first.id);
  await expect(
    page.getByRole("textbox", { name: "Headline", exact: true }),
  ).toHaveValue("Unsaved opening edit");
  await expect(
    page.getByRole("button", { name: "Opening Page", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  // Selecting a continuation and reflowing/reordering must retain story-relative identity.
  await continuation.click({ position: { x: 200, y: 160 } });
  const originalPhysical =
    await continuation.getAttribute("data-physical-page");
  await page
    .getByRole("button", { name: "Move Notice Board up", exact: true })
    .click();
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  await expect(continuation).not.toHaveAttribute(
    "data-physical-page",
    originalPhysical!,
  );
  await expect(continuation).toHaveAttribute("data-editor-selected", "true");
  await page
    .getByRole("textbox", { name: "Headline", exact: true })
    .fill("Reflowed later headline");
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  await expect(editor).toHaveAttribute("data-story-id", story.id);
  await expect(continuation).toHaveAttribute("data-editor-selected", "true");
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: /^Notice Board/ }).click();
  await page
    .getByRole("button", { name: "Reflowed later headline", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Headline", exact: true }),
  ).toHaveValue("Reflowed later headline");
});
test("compact headline and badge controls persist, reset, sync and leave canonical index unchanged", async ({
  page,
}) => {
  const { first } = await open(page);
  const frame = page.frameLocator("iframe");
  await page.getByText("Headline Layout", { exact: false }).first().click();
  await page.getByLabel("Headline width", { exact: false }).fill("80");
  await page
    .getByLabel("Manual headline breaks")
    .fill("Display only\nTwo lines");
  await page.getByLabel("Headline lines", { exact: true }).selectOption("2");
  await page.getByText("Story Badge", { exact: false }).first().click();
  await page.getByLabel("Show story badge").check();
  await page.getByLabel("Badge text", { exact: true }).fill("Spotlight");
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  const opening = frame.locator(`#pages [data-story-id="${first.id}"]`);
  await expect(opening.locator(".story-title")).toHaveText(
    "Display only\nTwo lines",
  );
  await expect(opening.locator(".story-badge")).toHaveText("Spotlight");
  await expect(frame.locator(".toc-story-title").first()).toHaveText(
    "Section opening",
  );
  await page.screenshot({ path: "test-results/headline-controls.png" });
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await page.reload();
  await expect(opening.locator(".story-badge")).toHaveText("Spotlight");
  await page
    .getByRole("textbox", { name: "Headline", exact: true })
    .fill("Canonical update");
  await expect(frame.locator(".toc-story-title").first()).toHaveText(
    "Canonical update",
  );
  await expect(opening.locator(".story-title")).toHaveText(
    "Display only\nTwo lines",
  );
  await page
    .locator(".compact-story-control")
    .first()
    .locator("summary")
    .click();
  await page.getByRole("button", { name: "Use synced headline" }).click();
  await expect(opening.locator(".story-title")).toHaveText("Canonical update");
  await page.getByRole("button", { name: "Reset headline layout" }).click();
  await page
    .locator(".compact-story-control")
    .nth(1)
    .locator("summary")
    .click();
  await page.getByLabel("Show story badge").uncheck();
  await expect(opening.locator(".headline-group")).toHaveCount(0);
});

test("removing a selected continuation through reflow does not select another page or override target", async ({
  page,
}) => {
  const issue = newIssue("Removed page selection", 23);
  issue.sections = [newSection("Cover Story")];
  const story = newStory();
  story.title = "Reflow selection";
  story.headlineLayout = {
    placement: "custom",
    verticalMm: 200,
    align: "left",
    width: 100,
    lines: "auto",
    fontSize: 24,
    lineHeight: 1.12,
  };
  story.blocks = [
    {
      id: id(),
      type: "paragraph",
      text: "Preserved article text. ".repeat(250),
    },
  ];
  issue.sections[0].stories = [story];
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript((data) => {
    localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, issue);
  await page.goto("/issues/" + issue.id);
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  const frame = page.frameLocator("iframe");
  const pages = frame.locator(`#pages .page[data-story-id="${story.id}"]`);
  await expect(pages).toHaveCount(2);
  await pages.nth(1).click({ position: { x: 180, y: 160 } });
  await expect(pages.nth(1)).toHaveAttribute("data-editor-selected", "true");
  await page
    .locator(".compact-story-control")
    .first()
    .locator("summary")
    .click();
  await page.getByLabel("Vertical position (mm)", { exact: true }).fill("");
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  await expect(pages).toHaveCount(1);
  await expect(page.locator(".story-editor")).toHaveAttribute(
    "data-story-id",
    story.id,
  );
  await expect(frame.locator('[data-editor-selected="true"]')).toHaveCount(0);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "selected story page no longer exists" }),
  ).toBeVisible();
  await page
    .locator(".background-design-summary")
    .getByRole("button", { name: "Customize" })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /Override this page/ }),
  ).toBeDisabled();
  expect(
    (await pages.locator(".text-block").allTextContents()).join("").trim(),
  ).toBe(story.blocks[0].text.trim());
});
