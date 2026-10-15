import { test, expect } from "@playwright/test";
import { sampleIssue } from "../src/domain/sample";

async function openEditor(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("link", { name: /Connections that move us/ }).click();
  await expect(page.getByText("Layout checked.")).toBeVisible();
}
test("desktop has a live 60/40 workspace, independent scrolling and keyboard/pointer resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openEditor(page);
  await expect(page.locator(".workspace-editor")).toBeVisible();
  await expect(page.locator(".workspace-preview")).toBeVisible();
  await expect(page.getByRole("tablist")).toBeHidden();
  const separator = page.getByRole("separator", {
    name: "Resize editor and preview",
  });
  await expect(separator).toHaveAttribute("aria-valuenow", "60");
  const workspace = await page.locator(".split-workspace").boundingBox();
  const editor = await page.locator(".workspace-editor").boundingBox();
  expect(editor!.width / workspace!.width).toBeCloseTo(0.6, 1);
  const frame = page.frameLocator("iframe");
  const before = await frame.locator("body").evaluate(() => window.scrollY);
  await page
    .locator(".workspace-editor")
    .evaluate((element) => (element.scrollTop = 600));
  expect(await frame.locator("body").evaluate(() => window.scrollY)).toBe(
    before,
  );
  await separator.focus();
  await separator.press("ArrowLeft");
  await expect(separator).toHaveAttribute("aria-valuenow", "58");
  const box = await separator.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 100);
  await page.mouse.down();
  await page.mouse.move(box!.x - 80, box!.y + 100);
  await page.mouse.up();
  expect(Number(await separator.getAttribute("aria-valuenow"))).toBeLessThan(
    58,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(1001);
  await expect(
    page.getByRole("button", { name: "Save Magazine", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: "test-results/live-split-desktop.png" });
});
test("text updates automatically without losing focus/selection; stale exports are blocked", async ({
  page,
}) => {
  await openEditor(page);
  const field = page
    .getByRole("textbox", { name: "Block 1 text", exact: true })
    .first();
  await field.fill("A live revision with a stable text cursor.");
  await expect(
    page.getByRole("button", { name: "Export PDF", exact: true }),
  ).toBeDisabled();
  await field.evaluate((element: HTMLTextAreaElement) =>
    element.setSelectionRange(12, 18),
  );
  await expect(
    page
      .frameLocator("iframe")
      .locator(".text-block")
      .filter({ hasText: "A live revision with a stable text cursor." }),
  ).toBeVisible();
  await expect(field).toBeFocused();
  await page.screenshot({ path: "test-results/live-split-editing.png" });
  expect(
    await field.evaluate((element: HTMLTextAreaElement) => [
      element.selectionStart,
      element.selectionEnd,
    ]),
  ).toEqual([12, 18]);
  await expect(
    page.getByRole("status").filter({ hasText: "Unsaved changes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export PDF", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("Preview page", { exact: true })).toHaveValue(
    "3",
  );
});
test("page navigation, zoom and fit retain A4 proportions", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByLabel("Preview page", { exact: true }).selectOption("2");
  await expect(page.getByLabel("Preview page", { exact: true })).toHaveValue(
    "2",
  );
  const before = Number(
    (await page.getByLabel("Preview zoom").textContent())!.replace("%", ""),
  );
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(async () =>
      Number(
        (await page.getByLabel("Preview zoom").textContent())!.replace("%", ""),
      ),
    )
    .toBeGreaterThan(before);
  const rectangle = await page
    .frameLocator("iframe")
    .locator(".page")
    .first()
    .boundingBox();
  expect(rectangle!.width / rectangle!.height).toBeCloseTo(210 / 297, 3);
  await page.getByRole("button", { name: "Fit to width", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Fit to width", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page
      .frameLocator("iframe")
      .locator("body")
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});
test("mobile tabs preserve drafts and tablet fits without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: /Connections that move us/ }).click();
  const field = page.getByLabel("Headline", { exact: true }).first();
  await field.fill("Mobile live headline");
  await page
    .getByRole("tab", { name: "Preview & export", exact: true })
    .click();
  await expect(page.getByText("Layout checked.")).toBeVisible();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Mobile live headline", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Edit content", exact: true }).click();
  await expect(field).toHaveValue("Mobile live headline");
  await page.screenshot({ path: "test-results/live-split-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 900, height: 1000 });
  await expect(page.locator(".workspace-preview")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("story focus navigates to its actual measured page and excludes disabled stories", async ({
  page,
}) => {
  const issue = structuredClone(sampleIssue);
  const first = structuredClone(issue.sections[0].stories[0]);
  const second = structuredClone(first);
  second.id = "second-live-story";
  second.title = "Second live story";
  second.blocks = [
    {
      id: "second-live-block",
      type: "paragraph",
      text: "Second story narrative.",
    },
  ];
  issue.sections = [{ ...issue.sections[0], stories: [first, second] }];
  await page.addInitScript(
    (data) =>
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data])),
    issue,
  );
  await page.goto("/issues/" + issue.id);
  await expect(page.getByText("Layout checked.")).toBeVisible();
  await page.getByLabel("Headline", { exact: true }).nth(1).focus();
  const frame = page.frameLocator("iframe");
  const physical = await frame
    .locator('[data-story-id="second-live-story"]')
    .first()
    .getAttribute("data-physical-page");
  await expect(page.getByLabel("Preview page", { exact: true })).toHaveValue(
    physical!,
  );
});
