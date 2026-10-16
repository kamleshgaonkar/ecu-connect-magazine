import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { newIssue, newSection, newStory, id } from "../src/domain/issue";
import { backgroundSchema } from "../src/domain/background";
import { magazineDocument } from "../src/magazine/document";
test("multiple high-resolution images export over 1 MB without changing layouts or original bytes", async ({
  page,
  request,
}) => {
  const issue = newIssue("High-resolution export verification", 22);
  const story = newStory();
  story.title = "High-resolution export verification";
  story.byline = "Editorial Team | editorial@example.test";
  issue.sections = [newSection("Cover Story")];
  issue.sections[0].stories = [story];
  const files: Buffer[] = [];
  for (const [index, colour] of ["#034EA2", "#701f50", "#007c61"].entries()) {
    // Deterministic high-resolution raster fixtures; these are not client photographs or brand assets.
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="5000"><defs><linearGradient id="g"><stop stop-color="${colour}"/><stop offset="1" stop-color="#FFDD00"/></linearGradient></defs><rect width="4000" height="5000" fill="url(#g)"/></svg>`,
    );
    files.push(await sharp(svg).jpeg({ quality: 100 }).toBuffer());
    story.blocks.push({
      id: id(),
      type: "figure",
      text: `Image fixture ${index + 1}`,
      image: {
        assetId: `photo-${index}`,
        alt: `High-resolution fixture ${index + 1}`,
        caption: "",
        credit: "",
        focalPoint: { x: 0.5, y: 0.5 },
        fit: "contain",
      },
      figureHeightMm: 150,
      breakBefore: index ? "page" : "auto",
    });
  }
  const originalHashes = files.map((bytes) =>
    createHash("sha256").update(bytes).digest("hex"),
  );
  expect(files.reduce((sum, buffer) => sum + buffer.length, 0)).toBeGreaterThan(
    1_000_000,
  );
  const assets = files.map((bytes, index) => ({
    id: `photo-${index}`,
    name: `photo-${index}.jpg`,
    mimeType: "image/jpeg" as const,
    width: 4000,
    height: 5000,
    byteLength: bytes.length,
  }));
  const reference = {
    assetId: "photo-0",
    alt: "Background",
    caption: "",
    credit: "",
    focalPoint: { x: 0.5, y: 0.5 },
  };
  story.background = backgroundSchema.parse({
    mode: "image",
    image: reference,
    coverage: 50,
    opacity: 30,
    fadeDirection: "down",
    fadeStrength: 100,
    contrast: "auto",
  });
  issue.renderAssets = assets.map((asset, index) => ({
    asset,
    dataUrl: "data:image/jpeg;base64," + files[index].toString("base64"),
  }));
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  const result = await page.evaluate(() => window.__magazineResult!);
  expect(result.warnings).toEqual([]);
  expect(result.pages).toBeGreaterThanOrEqual(5);
  await expect(page.locator(".story-author-credit")).toHaveCount(1);
  const metadata = { ...issue };
  delete metadata.renderAssets;
  const multipart: Record<
    string,
    string | { name: string; mimeType: string; buffer: Buffer }
  > = { issue: JSON.stringify(metadata), assets: JSON.stringify(assets) };
  for (const [index, buffer] of files.entries())
    multipart[`image:photo-${index}`] = {
      name: assets[index].name,
      mimeType: "image/jpeg",
      buffer,
    };
  const response = await request.post("/api/export", { multipart });
  expect(response.status()).toBe(200);
  const pdf = await response.body();
  expect(
    (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length,
  ).toBe(result.pages);
  expect(pdf.toString("latin1")).toContain("/Font");
  await writeFile("test-results/high-resolution-magazine.pdf", pdf);
  const imageDictionaries = [
    ...pdf.toString("latin1").matchAll(/\/Subtype\s*\/Image\b[\s\S]*?stream/g),
  ].map((match) => match[0]);
  // Existing cover/contents decorations include grayscale raster objects. Count colour photographs separately.
  const colourImages = imageDictionaries.filter(
    (dictionary) => !dictionary.includes("/DeviceGray"),
  );
  expect(colourImages).toHaveLength(4); // Three full photographs and one shared cropped background variant.
  expect(
    colourImages.filter((dictionary) => /\/Height 3508\b/.test(dictionary)),
  ).toHaveLength(3);
  expect(
    files.map((bytes) => createHash("sha256").update(bytes).digest("hex")),
  ).toEqual(originalHashes);
  await page
    .locator(`[data-story-id="${story.id}"]`)
    .last()
    .screenshot({ path: "test-results/final-page-credit.png" });
});
