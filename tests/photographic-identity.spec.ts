import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { newIssue, newSection } from "../src/domain/issue";
import { backgroundSchema } from "../src/domain/background";
import { magazineDocument } from "../src/magazine/document";

test("photographic section identity stays transparent without changing body layout or non-photo masters", async ({
  page,
  request,
}) => {
  const issue = newIssue("Photographic identity regression", 21);
  issue.sections = [newSection("Cover Story")];
  const story = issue.sections[0].stories[0];
  story.title = "Opening headline";
  story.subtitle = "Opening subheadline";
  const bytes = await sharp({
    create: { width: 1200, height: 1600, channels: 3, background: "#dddddd" },
  })
    .png()
    .toBuffer();
  issue.renderAssets = [
    {
      asset: {
        id: "photo",
        name: "regression.png",
        mimeType: "image/png",
        width: 1200,
        height: 1600,
        byteLength: bytes.length,
      },
      dataUrl: "data:image/png;base64," + bytes.toString("base64"),
    },
  ];
  const render = async () => {
    await page.goto("about:blank");
    await page.setContent(magazineDocument(issue));
    await page.waitForFunction(() => window.__magazineReady);
  };
  await render();
  const article = page.locator(`[data-story-id="${story.id}"]`).first();
  const bodyBefore = await article.locator(".page-body").evaluate((el) => ({
    top: getComputedStyle(el).top,
    height: getComputedStyle(el).height,
  }));
  await expect(article).not.toHaveClass(/photographic-section-identity/);
  await expect(article.locator(".blank-section-number")).toHaveCSS(
    "color",
    "rgb(128, 128, 128)",
  );
  story.background = backgroundSchema.parse({
    mode: "image",
    image: { assetId: "photo", alt: "Test photograph" },
    coverage: 50,
    fadeStrength: 0,
    contrast: "light",
  });
  await render();
  await expect(article).toHaveClass(/photographic-section-identity/);
  for (const selector of [".blank-section-number", ".section-header"]) {
    await expect(article.locator(selector)).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await expect(article.locator(selector)).not.toHaveAttribute(
      "data-contrast",
      /backed/,
    );
  }
  await expect(article.locator(".section-header")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  const geometry = await article.evaluate((el) => {
    const p = el.getBoundingClientRect();
    const n = el
      .querySelector(".blank-section-number")!
      .getBoundingClientRect();
    const h = el.querySelector(".section-header")!.getBoundingClientRect();
    return {
      gap: h.top - n.bottom,
      left: h.left - p.left,
      width: h.width / p.width,
      z: getComputedStyle(el.querySelector(".section-header")!).zIndex,
    };
  });
  expect(geometry.gap).toBeGreaterThanOrEqual(0);
  expect(geometry.left).toBeGreaterThan(0);
  expect(geometry.width).toBeLessThan(0.5);
  expect(Number(geometry.z)).toBeGreaterThan(0);
  expect(
    await article.locator(".page-body").evaluate((el) => ({
      top: getComputedStyle(el).top,
      height: getComputedStyle(el).height,
    })),
  ).toEqual(bodyBefore);
  await expect(article.locator(".story-title")).toHaveText(story.title);
  await expect(article.locator(".subtitle")).toHaveText(story.subtitle);
  await article.screenshot({ path: "test-results/photographic-identity.png" });
  const exported = await request.post("/api/export", { data: issue });
  expect(exported.status()).toBe(200);
  expect((await exported.body()).subarray(0, 4).toString()).toBe("%PDF");
  story.background = backgroundSchema.parse({
    mode: "solid",
    colour: "#FFFFFF",
    contrast: "light",
  });
  await render();
  await expect(article).not.toHaveClass(/photographic-section-identity/);
  await expect(article.locator(".blank-section-number")).toHaveAttribute(
    "data-contrast",
    "backed-light",
  );
});

test("original photographic master uses the same transparent identity in Original and Light contrast", async ({
  page,
}) => {
  const issue = newIssue("Original opener", 21);
  issue.sections = [newSection("Cover Story")];
  const story = issue.sections[0].stories[0];
  story.title = "Photographic opener";
  delete story.pagePair;
  issue.sections[0].template = "opener";
  const bytes = await sharp({
    create: { width: 1200, height: 1600, channels: 3, background: "#dddddd" },
  })
    .png()
    .toBuffer();
  issue.renderAssets = [
    {
      asset: {
        id: "hero",
        name: "hero.png",
        mimeType: "image/png",
        width: 1200,
        height: 1600,
        byteLength: bytes.length,
      },
      dataUrl: "data:image/png;base64," + bytes.toString("base64"),
    },
  ];
  story.visual = {
    hero: {
      assetId: "hero",
      alt: "Fixture",
      focalPoint: { x: 0.5, y: 0.5 },
      fit: "cover",
      caption: "",
      credit: "",
    },
    position: "below",
    heroLayout: "large",
    summary: "",
  };
  for (const contrast of ["original", "light"] as const) {
    story.background = backgroundSchema.parse({ contrast });
    await page.goto("about:blank");
    await page.setContent(magazineDocument(issue));
    await page.waitForFunction(() => window.__magazineReady);
    const article = page.locator(`[data-story-id="${story.id}"]`).first();
    await expect(article).toHaveClass(/photographic-section-identity/);
    for (const selector of [".section-ordinal", ".section-header"]) {
      await expect(article.locator(selector)).toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
      await expect(article.locator(selector)).not.toHaveAttribute(
        "data-contrast",
        /backed/,
      );
    }
  }
});
