import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import {
  newIssue,
  newSection,
  newStory,
  id,
  type Issue,
} from "../src/domain/issue";
import { backgroundSchema } from "../src/domain/background";
import { magazineDocument } from "../src/magazine/document";
async function render(page: Page, issue: Issue) {
  await page.goto("about:blank");
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
}
async function fixture() {
  const issue = newIssue("Credits and contrast", 22);
  issue.sections = [newSection("Cover Story")];
  issue.sections[0].stories[0].title = "Section opening";
  const story = newStory();
  story.title = "Readable headline";
  story.subtitle = "Readable subheadline";
  story.byline = "Ana Jimenez | anajimenez@ecuworldwide.com";
  story.blocks = [0, 1, 2].map((index) => ({
    id: id(),
    type: "paragraph" as const,
    text: `Article page ${index + 1}`,
    breakBefore: index ? ("page" as const) : ("auto" as const),
  }));
  issue.sections[0].stories.push(story);
  return { issue, story };
}
test("author credits use the final story page, follow repagination, preserve source and export", async ({
  page,
  request,
}) => {
  const { issue, story } = await fixture();
  const nameOnly = newStory();
  nameOnly.title = "No invented email";
  nameOnly.byline = "Editorial Team";
  issue.sections[0].stories.push(nameOnly);
  const original = JSON.stringify(story);
  await render(page, issue);
  let pages = page.locator(`[data-story-id="${story.id}"]`);
  await expect(pages).toHaveCount(3);
  await expect(pages.nth(0).locator(".story-author-credit")).toHaveCount(0);
  await expect(pages.nth(1).locator(".story-author-credit")).toHaveCount(0);
  await expect(pages.nth(2).locator(".story-author-credit")).toHaveText(
    story.byline,
  );
  await expect(
    page.locator(`[data-story-id="${nameOnly.id}"] .story-author-credit`),
  ).toHaveText("Editorial Team");
  await expect(pages.locator(".byline")).toHaveCount(0);
  const geometry = await pages.last().evaluate((node) => {
    const credit = node
        .querySelector(".story-author-credit")!
        .getBoundingClientRect(),
      body = node.querySelector(".page-body")!.getBoundingClientRect(),
      footer = node.querySelector(".page-footer")!.getBoundingClientRect();
    return {
      credit: { top: credit.top, bottom: credit.bottom, left: credit.left },
      body: { bottom: body.bottom, left: body.left },
      footer: { top: footer.top },
    };
  });
  expect(geometry.credit.top).toBeGreaterThan(geometry.body.bottom);
  expect(geometry.credit.bottom).toBeLessThan(geometry.footer.top);
  expect(geometry.credit.left).toBeCloseTo(geometry.body.left, 1);
  expect(JSON.stringify(story)).toBe(original);
  story.blocks.push({
    id: id(),
    type: "paragraph",
    text: "New last page",
    breakBefore: "page",
  });
  await render(page, issue);
  pages = page.locator(`[data-story-id="${story.id}"]`);
  await expect(pages).toHaveCount(4);
  await expect(pages.locator(".story-author-credit")).toHaveCount(1);
  await expect(pages.last().locator(".story-author-credit")).toHaveText(
    story.byline,
  );
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  const response = await request.post("/api/export", { data: issue });
  expect(response.status()).toBe(200);
  const pdf = await response.body();
  await writeFile("test-results/credits-sample.pdf", pdf);
  expect(
    (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length,
  ).toBe(8);
});

test("auto samples local gradients, includes folios and credits, Original retains template colours", async ({
  page,
}) => {
  const { issue, story } = await fixture();
  story.blocks = story.blocks.slice(0, 1);
  story.background = backgroundSchema.parse({
    mode: "gradient",
    colour: "#000000",
    gradientColour: "#FFFFFF",
    contrast: "auto",
    direction: 180,
  });
  await render(page, issue);
  const article = page.locator(`[data-story-id="${story.id}"]`);
  await expect(article.locator(".story-title")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await expect(article.locator(".text-block")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await expect(article.locator(".section-header")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await expect(article.locator(".story-author-credit")).toHaveCSS(
    "color",
    "rgb(30, 30, 30)",
  );
  await expect(article.locator(".footer-label")).toHaveCSS(
    "color",
    "rgb(30, 30, 30)",
  );
  await expect(article.locator(".page-number")).toHaveAttribute(
    "data-contrast",
    /original|dark/,
  );
  await expect(article.locator(".top-accent")).toHaveCSS(
    "background-color",
    "rgb(255, 221, 0)",
  );
  await article.screenshot({ path: "test-results/contrast-gradient.png" });
  story.background.contrast = "original";
  await render(page, issue);
  await expect(article.locator(".story-title")).toHaveCSS(
    "color",
    "rgb(3, 78, 162)",
  );
  await expect(article.locator("[data-contrast]")).toHaveCount(0);
  delete story.background.contrast; // legacy custom backgrounds retain the same Original behaviour.
  await render(page, issue);
  await expect(article.locator("[data-contrast]")).toHaveCount(0);
});

test("mixed photographs receive local protection; Light/Dark, backing and shadow are explicit", async ({
  page,
  request,
}) => {
  const { issue, story } = await fixture();
  story.blocks = story.blocks.slice(0, 1);
  const bytes = await sharp({
    create: { width: 1600, height: 2400, channels: 3, background: "#000000" },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 800,
            height: 2400,
            channels: 3,
            background: "#FFFFFF",
          },
        })
          .png()
          .toBuffer(),
        left: 800,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
  issue.renderAssets = [
    {
      asset: {
        id: "mixed",
        name: "contrast-fixture.png",
        mimeType: "image/png",
        width: 1600,
        height: 2400,
        byteLength: bytes.length,
      },
      dataUrl: "data:image/png;base64," + bytes.toString("base64"),
    },
  ];
  story.background = backgroundSchema.parse({
    mode: "image",
    contrast: "auto",
    image: { assetId: "mixed", alt: "", focalPoint: { x: 0.5, y: 0.5 } },
    fadeStrength: 0,
  });
  await render(page, issue);
  const article = page.locator(`[data-story-id="${story.id}"]`);
  await expect(article.locator(".story-title")).toHaveAttribute(
    "data-contrast",
    /backed/,
  );
  await article.screenshot({ path: "test-results/contrast-photo.png" });
  const exportResult = await request.post("/api/export", { data: issue });
  expect(exportResult.status()).toBe(200);
  await writeFile(
    "test-results/contrast-sample.pdf",
    await exportResult.body(),
  );
  story.background.contrast = "light";
  story.background.textTreatment = "none";
  await render(page, issue);
  await expect(article.locator(".story-title")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await expect(article.locator(".story-title")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  story.background.contrast = "dark";
  story.background.textTreatment = "shadow";
  await render(page, issue);
  await expect(article.locator(".story-title")).toHaveCSS(
    "color",
    "rgb(30, 30, 30)",
  );
  await expect(article.locator(".story-title")).toHaveAttribute(
    "data-contrast",
    "shadow-dark",
  );
});

test("contrast inherits per story, page overrides stay independent and long credits never clip silently", async ({
  page,
  request,
}) => {
  const { issue, story } = await fixture();
  story.background = backgroundSchema.parse({
    mode: "solid",
    colour: "#000000",
    contrast: "auto",
  });
  story.pageBackgrounds = {
    "1": backgroundSchema.parse({
      mode: "solid",
      colour: "#FFFFFF",
      contrast: "dark",
    }),
  };
  await render(page, issue);
  const pages = page.locator(`[data-story-id="${story.id}"]`);
  await expect(pages.nth(0).locator(".text-block")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await expect(pages.nth(1).locator(".text-block")).toHaveCSS(
    "color",
    "rgb(30, 30, 30)",
  );
  await expect(pages.nth(2).locator(".story-author-credit")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  story.byline = "A\n".repeat(70);
  await render(page, issue);
  expect(
    (await page.evaluate(() => window.__magazineResult!.warnings)).join(" "),
  ).toContain("author credit overlaps");
  expect((await request.post("/api/export", { data: issue })).status()).toBe(
    422,
  );
});
