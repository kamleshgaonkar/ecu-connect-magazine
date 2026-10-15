import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { sampleIssue } from "../src/domain/sample";
import { newStory } from "../src/domain/issue";
import { magazineDocument } from "../src/magazine/document";
import { buildRenderModel } from "../src/magazine/templates";
const bytes = readFileSync("tests/fixtures/crop-calibration.png");
const reference = {
  assetId: "test-image",
  alt: "Crop calibration image",
  caption: "",
  credit: "Test fixture",
  fit: "cover" as const,
  focalPoint: { x: 0.2, y: 0.7 },
};
const asset = {
  asset: {
    id: "test-image",
    name: "crop-calibration.png",
    mimeType: "image/png" as const,
    width: 320,
    height: 200,
    byteLength: bytes.length,
  },
  dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
};
function visualIssue() {
  const issue = structuredClone(sampleIssue);
  issue.cover = {
    headline: "Local visual proof",
    supportingText: "A test edition",
    edition: "FORTNIGHTLY EDITION",
    surface: "white",
    image: reference,
  };
  issue.renderAssets = [asset];
  issue.sections[0].template = "opener";
  issue.sections[0].stories[0].visual = {
    summary: "A contents summary",
    thumbnail: reference,
    hero: reference,
    position: "below",
    heroLayout: "large",
  };
  return issue;
}
test("local images and crop settings survive save/reload and export from the editor", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Connections that move us/ }).click();
  await page.getByRole("button", { name: /^Magazine Details/ }).click();
  await page.getByText("Cover Design", { exact: true }).click();
  await page
    .getByLabel("Upload cover photo", { exact: true })
    .setInputFiles("tests/fixtures/crop-calibration.png");
  await expect(page.getByLabel("Cover photo description")).toBeVisible();
  await page.getByLabel("Cover photo description").fill("My local cover");
  await page.getByLabel("Cover photo horizontal position").fill("20");
  await page
    .getByRole("combobox", { name: "Cover photo fit", exact: true })
    .selectOption("contain");
  const imageId = await page
    .getByLabel("Cover photo — choose image")
    .inputValue();
  await page.locator(".outline-section").first().click();
  await page.locator(".outline-story").first().click();
  await page.getByText("Story Images & Contents", { exact: true }).click();
  await page.getByLabel("Opening photo — choose image").selectOption(imageId);
  await page
    .getByLabel("Contents thumbnail — choose image")
    .selectOption(imageId);
  await page
    .getByLabel("Contents summary", { exact: true })
    .fill("Saved contents summary");
  await page.getByText("Advanced Layout", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Opening Page Layout", exact: true })
    .selectOption("opener");
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved locally" }),
  ).toBeVisible();
  const raw = await page.evaluate(() =>
    localStorage.getItem("ecu-connect:issues:v1")!,
  );
  expect(raw).not.toContain("data:image");
  expect(raw).not.toContain("renderAssets");
  await page.reload();
  await expect(page.getByText("Layout checked.")).toBeVisible();
  const frame = page.frameLocator("iframe");
  await expect(frame.locator(".cover-photo")).toHaveAttribute(
    "alt",
    "My local cover",
  );
  expect(
    await frame
      .locator(".cover-photo")
      .evaluate((e) => getComputedStyle(e).objectPosition),
  ).toBe("20% 50%");
  expect(
    await frame
      .locator(".cover-photo")
      .evaluate((e) => getComputedStyle(e).objectFit),
  ).toBe("contain");
  await expect(frame.locator(".toc-summary")).toContainText(
    "Saved contents summary",
  );
  await expect(frame.locator(".opener-photo")).toHaveAttribute(
    "src",
    /^data:image/,
  );
  await page.getByText(/^Review issues/).click();
  await expect(page.getByText(/may look soft in print/).first()).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const result = await download;
  expect(result.suggestedFilename()).toBe("ecu-connect-volume-21.pdf");
  expect(
    readFileSync((await result.path())!)
      .subarray(0, 4)
      .toString(),
  ).toBe("%PDF");
});
test("T03 uses one ordinal per section, continues long narrative intact and follows reordered sections", async ({
  page,
  request,
}) => {
  const issue = visualIssue();
  issue.sections = issue.sections.slice(0, 3).reverse();
  issue.sections[1].enabled = false;
  for (const section of issue.sections) {
    section.template = "opener";
    section.stories[0].visual = {
      summary: "",
      hero: reference,
      position: "right",
      heroLayout: "full",
    };
    section.stories.push({ ...newStory(), title: "Second article" });
  }
  const long = "A careful local editorial narrative. ".repeat(400);
  issue.sections[0].stories[0].subtitle = "";
  issue.sections[0].stories[0].byline = "";
  issue.sections[0].stories[0].blocks = [
    { id: "long-opener-block", type: "paragraph", text: long },
  ];
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  expect(await page.locator(".section-ordinal").allTextContents()).toEqual([
    "01",
    "02",
  ]);
  await expect(page.locator(".opener .section-header").first()).toHaveText(
    issue.sections[0].name,
  );
  expect(
    await page
      .locator(
        `[data-story-id="${issue.sections[0].stories[0].id}"] .text-block`,
      )
      .allTextContents()
      .then((t) => t.join("")),
  ).toBe(long);
  await expect(
    page
      .locator(
        `[data-story-id="${issue.sections[0].stories[0].id}"][data-master="article"]`,
      )
      .first(),
  ).toBeVisible();
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  const model = buildRenderModel(issue);
  const layout = await page.evaluate(() => window.__magazineResult!);
  for (let i = 0; i < model.stories.length; i++)
    expect(await page.locator(".toc-number").nth(i).textContent()).toBe(
      String(layout.storyPages[model.stories[i].story.id].folio).padStart(
        2,
        "0",
      ),
    );
  expect((await request.post("/api/export", { data: issue })).status()).toBe(
    200,
  );
});
test("missing, corrupt and inaccurate image metadata block export; low resolution remains a notice", async ({
  page,
  request,
}) => {
  const issue = visualIssue();
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  expect(
    await page.evaluate(() => window.__magazineResult!.notices.join(" ")),
  ).toContain("Low-resolution image");
  const missing = await request.post("/api/export", {
    data: { ...issue, renderAssets: [] },
  });
  expect(missing.status()).toBe(422);
  expect((await missing.json()).error).toContain("Missing local image");
  const corrupt = await request.post("/api/export", {
    data: {
      ...issue,
      renderAssets: [
        {
          asset: { ...asset.asset, byteLength: 3 },
          dataUrl: "data:image/png;base64,AQID",
        },
      ],
    },
  });
  expect(corrupt.status()).toBe(422);
  expect((await corrupt.json()).error).toContain("cannot be decoded");
  const dimensions = await request.post("/api/export", {
    data: {
      ...issue,
      renderAssets: [{ ...asset, asset: { ...asset.asset, width: 900 } }],
    },
  });
  expect(dimensions.status()).toBe(422);
  expect((await dimensions.json()).error).toContain("dimensions do not match");
  const external = await request.post("/api/export", {
    data: {
      ...issue,
      renderAssets: [{ ...asset, dataUrl: "https://example.com/photo.png" }],
    },
  });
  expect(external.status()).toBe(400);
});
test("oversized fixed cover and contents entries remain visible and block PDF", async ({
  page,
  request,
}) => {
  const issue = visualIssue();
  issue.cover!.supportingText = "W".repeat(500);
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  await expect(page.locator(".cover-support")).toHaveText("W".repeat(500));
  expect(
    await page.evaluate(() => window.__magazineResult!.warnings.join(" ")),
  ).toContain("Cover title");
  expect((await request.post("/api/export", { data: issue })).status()).toBe(
    422,
  );
  issue.cover!.supportingText = "";
  issue.sections[0].stories[0].visual!.summary = "W".repeat(1000);
  await page.goto("about:blank");
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  await expect(page.locator(".toc-summary").first()).toHaveText(
    "W".repeat(1000),
  );
  expect(
    await page.evaluate(() => window.__magazineResult!.warnings.join(" ")),
  ).toContain("contents entry is too tall");
});
test("new editor image controls remain usable on mobile and unsupported uploads fail clearly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: /Connections that move us/ }).click();
  await page.getByRole("button", { name: /^Magazine Details/ }).click();
  await page.getByText("Cover Design", { exact: true }).click();
  await page.getByLabel("Upload cover photo", { exact: true }).setInputFiles({
    name: "unsupported.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg></svg>"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "Choose a PNG" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("large local uploads remain previewable but the unchanged PDF request cap is explicit", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Connections that move us/ }).click();
  await page.getByRole("button", { name: /^Magazine Details/ }).click();
  await page.getByText("Cover Design", { exact: true }).click();
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 700;
    const context = canvas.getContext("2d")!;
    const pixels = context.createImageData(700, 700);
    let seed = 42;
    for (let i = 0; i < pixels.data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      pixels.data[i] = i % 4 === 3 ? 255 : seed >>> 24;
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/png");
  });
  const buffer = Buffer.from(dataUrl.split(",")[1], "base64");
  expect(buffer.length).toBeGreaterThan(750_000);
  await page
    .getByLabel("Upload cover photo", { exact: true })
    .setInputFiles({ name: "large-local.png", mimeType: "image/png", buffer });
  await expect(page.getByLabel("Cover photo description")).toBeVisible();
  await expect(page.getByText("Layout checked.")).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "1 MB PDF request limit" }),
  ).toBeVisible();
  await expect(
    page.frameLocator("iframe").locator(".cover-photo"),
  ).toHaveAttribute("src", /^data:image/);
  await expect(
    page.getByRole("button", { name: "Export PDF", exact: true }),
  ).toBeDisabled();
});
