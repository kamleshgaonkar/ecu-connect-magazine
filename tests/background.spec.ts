import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  newIssue,
  newSection,
  newStory,
  id,
  type Issue,
} from "../src/domain/issue";
import { backgroundSchema } from "../src/domain/background";
import { magazineDocument } from "../src/magazine/document";
async function setInput(locator: Locator, value: string) {
  await locator.evaluate((node, value) => {
    const input = node as HTMLInputElement;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
function fixture() {
  const issue = newIssue("Background design checks", 21);
  issue.sections = [newSection("Cover Story")];
  const story = newStory();
  story.title = "Background story";
  story.subtitle = "Unchanged introduction";
  story.byline = "Unchanged author";
  story.blocks = [0, 1, 2].map((n) => ({
    id: id(),
    type: "paragraph" as const,
    text: `Saved article page ${n + 1}`,
    breakBefore: n ? ("page" as const) : ("auto" as const),
  }));
  issue.sections[0].stories.push(story);
  return { issue, story };
}
async function ready(page: Page) {
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
}
async function save(page: Page) {
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved locally" }),
  ).toBeVisible();
  return page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0] as Issue,
  );
}
test("story background inheritance, selected-page overrides, local image fades, persistence and export", async ({
  page,
  request,
}) => {
  const { issue, story } = fixture();
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript((issue) => {
    if (!localStorage.getItem("ecu-connect:issues:v1"))
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([issue]));
  }, issue);
  await page.goto("/issues/" + issue.id);
  await page.getByRole("button", { name: story.title, exact: true }).click();
  await ready(page);
  const frame = page.frameLocator("iframe");
  const pages = frame.locator(`[data-story-id="${story.id}"]`);
  await expect(pages).toHaveCount(3);
  await expect(frame.locator(".page-background")).toHaveCount(0);
  const summary = page.locator(".background-design-summary");
  await expect(summary).toContainText("Default original");
  await summary.getByRole("button", { name: "Customize" }).click();
  const panel = page.getByRole("dialog", {
    name: "Background Design settings",
  });
  await expect(panel).toContainText("Story Background");
  const bounds = await panel.boundingBox();
  const editorBounds = await page.locator(".workspace-editor").boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(editorBounds!.x);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
    editorBounds!.x + editorBounds!.width,
  );

  await panel
    .getByLabel("Background type", { exact: true })
    .selectOption("solid");
  await setInput(
    panel.getByLabel("Background colour", { exact: true }),
    "#ddeeff",
  );
  for (let n = 0; n < 3; n++)
    await expect(pages.nth(n).locator(".page-background")).toHaveCSS(
      "background-color",
      "rgb(221, 238, 255)",
    );
  await expect(
    frame.locator(".blank-opening-white .page-background"),
  ).toHaveCount(0);
  await page.screenshot({ path: "test-results/background-design-panel.png" });
  await panel.getByRole("button", { name: "Close Background Design" }).click();
  // Preview navigation selects the second page of this story, not physical PDF page 2.
  await page.getByLabel("Preview page", { exact: true }).selectOption("5");
  await summary.getByRole("button", { name: "Customize" }).click();
  await expect(panel.locator(".background-override-toggle")).toContainText(
    "Story page 2",
  );
  await panel.getByRole("checkbox", { name: /Override this page/ }).check();
  await expect(panel.locator(".background-panel-heading")).toHaveText(
    /Page Override · Story page 2/,
  );
  await setInput(
    panel.getByLabel("Background colour", { exact: true }),
    "#ffdd00",
  );
  await expect(pages.nth(1).locator(".page-background")).toHaveCSS(
    "background-color",
    "rgb(255, 221, 0)",
  );
  await panel
    .getByRole("button", { name: "Story Background", exact: true })
    .click();
  await panel
    .getByLabel("Background type", { exact: true })
    .selectOption("gradient");
  await setInput(panel.getByLabel("Gradient start colour"), "#ffffff");
  await setInput(panel.getByLabel("Gradient end colour"), "#034ea2");
  await setInput(panel.getByLabel("Gradient direction", { exact: true }), "90");
  await expect(pages.nth(0).locator(".page-background")).toHaveCSS(
    "background-image",
    "linear-gradient(90deg, rgb(255, 255, 255), rgb(3, 78, 162))",
  );
  await expect(pages.nth(2).locator(".page-background")).toHaveCSS(
    "background-image",
    "linear-gradient(90deg, rgb(255, 255, 255), rgb(3, 78, 162))",
  );
  await expect(pages.nth(1).locator(".page-background")).toHaveCSS(
    "background-color",
    "rgb(255, 221, 0)",
  );
  await panel
    .getByLabel("Background type", { exact: true })
    .selectOption("image");
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 2400;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#ff0000";
    context.fillRect(0, 0, 1600, 1200);
    context.fillStyle = "#0000ff";
    context.fillRect(0, 1200, 1600, 1200);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await panel
    .getByLabel("Upload background image", { exact: true })
    .setInputFiles({
      name: "background-fixture.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  await expect(pages.nth(0).locator(".background-photo")).toHaveCount(1);
  await panel
    .getByLabel("Image placement", { exact: true })
    .selectOption("bottom");
  await setInput(panel.getByLabel("Image coverage", { exact: true }), "50");
  await setInput(panel.getByLabel("Image opacity", { exact: true }), "75");
  await panel.getByLabel("Fade direction", { exact: true }).selectOption("up");
  await setInput(panel.getByLabel("Fade start", { exact: true }), "20");
  await setInput(panel.getByLabel("Fade strength", { exact: true }), "100");
  await setInput(
    panel.getByLabel("Fade-to colour", { exact: true }),
    "#ffffff",
  );
  await setInput(
    panel.getByLabel("Background image horizontal position"),
    "25",
  );
  await setInput(panel.getByLabel("Background image vertical position"), "75");
  await expect(pages.nth(0).locator(".background-photo")).toHaveCSS(
    "opacity",
    "0.75",
  );
  await expect(pages.nth(0).locator(".background-photo")).toHaveCSS(
    "object-position",
    "25% 75%",
  );
  await expect(pages.nth(0).locator(".background-fade")).toHaveCSS(
    "background-image",
    "linear-gradient(to top, rgba(255, 255, 255, 0) 20%, rgb(255, 255, 255) 100%)",
  );
  await panel.getByRole("button", { name: "Close Background Design" }).click();
  const stored = await save(page);
  expect(stored.sections[0].stories[1].blocks).toEqual(story.blocks);
  expect(stored.sections[0].stories[1].title).toBe(story.title);
  await page.reload();
  await ready(page);
  await expect(pages.nth(0).locator(".background-photo")).toHaveCSS(
    "opacity",
    "0.75",
  );
  await expect(pages.nth(1).locator(".page-background")).toHaveCSS(
    "background-color",
    "rgb(255, 221, 0)",
  );
  await page.getByRole("button", { name: story.title, exact: true }).click();
  // Fullscreen uses the same rendered layers and page selection.
  const fullscreen = page.getByRole("button", {
    name: "Open full-screen preview",
    exact: true,
  });
  await fullscreen.focus();
  await fullscreen.press("Enter");
  await expect(pages.nth(0).locator(".background-photo")).toHaveCSS(
    "object-fit",
    "cover",
  );
  await frame
    .getByRole("button", { name: "Go to page 5", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Close full-screen preview", exact: true })
    .press("Enter");
  await summary.getByRole("button", { name: "Customize" }).click();
  await expect(panel.locator(".background-panel-heading")).toHaveText(
    /Page Override · Story page 2/,
  );
  await panel
    .getByRole("button", { name: "Reset to Story Background", exact: true })
    .click();
  await expect(pages.nth(1).locator(".background-photo")).toHaveCount(1);
  await panel.getByRole("button", { name: "Close Background Design" }).click();
  // Send the persisted issue with bytes from the same IndexedDB transport used by the UI.
  const transport: Issue = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("ecu-connect:media:v1", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const rows = await new Promise<
      Array<{ asset: unknown; bytes: Uint8Array }>
    >((resolve) => {
      const r = db.transaction("assets").objectStore("assets").getAll();
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    const issue = JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0];
    issue.renderAssets = rows.map((row) => ({
      asset: row.asset,
      dataUrl:
        "data:image/png;base64," +
        btoa(Array.from(row.bytes, (n) => String.fromCharCode(n)).join("")),
    }));
    return issue;
  });
  const response = await request.post("/api/export", { data: transport });
  expect(response.status()).toBe(200);
  const pdf = await response.body();
  expect(
    (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length,
  ).toBe(6);
  expect(pdf.toString("latin1")).toContain("/Subtype /Image");
});

test("backgrounds follow new continuations and story order; original override restores original page", async ({
  page,
}) => {
  const { issue, story } = fixture();
  story.background = backgroundSchema.parse({
    mode: "solid",
    colour: "#CCEEFF",
  });
  story.pageBackgrounds = { "1": backgroundSchema.parse({ mode: "default" }) };
  story.blocks.push({
    id: id(),
    type: "paragraph",
    text: "New continuation",
    breakBefore: "page",
  });
  const other = newSection("Notice Board");
  other.stories[0].background = backgroundSchema.parse({
    mode: "solid",
    colour: "#FFDD00",
  });
  issue.sections.push(other);
  issue.sections.reverse();
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  const pages = page.locator(`[data-story-id="${story.id}"]`);
  await expect(pages).toHaveCount(4);
  await expect(pages.nth(1).locator(".page-background")).toHaveCount(0);
  for (const n of [0, 2, 3])
    await expect(pages.nth(n).locator(".page-background")).toHaveCSS(
      "background-color",
      "rgb(204, 238, 255)",
    );
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
});

test("top, centre and bottom image regions blend in both directions in the shared A4 renderer", async ({
  page,
  request,
}) => {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const issue = newIssue("Background visual fixtures", 21);
  issue.sections = [newSection("Cover Story")];
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1800;
    canvas.height = 1800;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#ff0000";
    c.fillRect(0, 0, 1800, 1800);
    return canvas.toDataURL("image/png");
  });
  issue.renderAssets = [
    {
      asset: {
        id: "fade-fixture",
        name: "Synthetic red background",
        width: 1800,
        height: 1800,
        mimeType: "image/png",
        byteLength: Buffer.from(dataUrl.split(",")[1], "base64").length,
      },
      dataUrl,
    },
  ];
  issue.sections[0].stories = [];
  for (const placement of ["top", "centre", "bottom"] as const) {
    for (const fadeDirection of ["down", "up"] as const) {
      const story = newStory();
      story.title = `${placement} ${fadeDirection}`;
      story.blocks = [];
      story.background = backgroundSchema.parse({
        mode: "image",
        colour: "#FFFFFF",
        image: {
          assetId: "fade-fixture",
          alt: "",
          focalPoint: { x: 0.5, y: 0.5 },
        },
        placement,
        fadeDirection,
        coverage: 50,
        fadeStart: 0,
        fadeStrength: 100,
      });
      issue.sections[0].stories.push(story);
    }
  }
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  await mkdir("test-results", { recursive: true });
  for (const story of issue.sections[0].stories) {
    const article = page.locator(`[data-story-id="${story.id}"]`);
    const geometry = await article.evaluate((node) => {
      const page = node.getBoundingClientRect(),
        image = node
          .querySelector(".page-background-image")!
          .getBoundingClientRect();
      return {
        coverage: image.height / page.height,
        top: (image.top - page.top) / page.height,
      };
    });
    expect(geometry.coverage).toBeCloseTo(0.5, 2);
    expect(geometry.top).toBeCloseTo(
      story.background!.placement === "top"
        ? 0
        : story.background!.placement === "bottom"
          ? 0.5
          : 0.25,
      2,
    );
    await article.screenshot({
      path: `test-results/background-${story.title.replace(" ", "-")}.png`,
    });
  }
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  const response = await request.post("/api/export", { data: issue });
  expect(response.status()).toBe(200);
  const pdf = await response.body();
  await writeFile("test-results/background-design-sample.pdf", pdf);
  expect(
    (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length,
  ).toBe(8);
  expect(pdf.toString("latin1")).toContain("/Subtype /Image");
});

test("missing background images produce clear warnings and block PDF export", async ({
  page,
  request,
}) => {
  const { issue, story } = fixture();
  story.background = backgroundSchema.parse({
    mode: "image",
    image: { assetId: "missing", alt: "" },
  });
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  expect(
    (await page.evaluate(() => window.__magazineResult!.warnings)).join(" "),
  ).toContain("Missing local image: missing");
  expect((await request.post("/api/export", { data: issue })).status()).toBe(
    422,
  );
});
