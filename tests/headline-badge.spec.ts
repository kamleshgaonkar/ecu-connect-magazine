import { test, expect, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import {
  newIssue,
  newSection,
  newStory,
  id,
  type Issue,
} from "../src/domain/issue";
import { headlineLayoutSchema, storyBadgeSchema } from "../src/domain/headline";
import { backgroundSchema } from "../src/domain/background";
import { magazineDocument } from "../src/magazine/document";
import sharp from "sharp";
async function render(page: Page, issue: Issue) {
  await page.goto("about:blank");
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
}
function fixture() {
  const issue = newIssue("Headline and badge verification", 23);
  issue.sections = [newSection("Cover Story")];
  const story = newStory();
  story.title = "Connections across oceans and continents";
  story.subtitle = "A readable opening narrative";
  story.byline = "Editorial Team | editorial@example.test";
  story.blocks = [0, 1].map((i) => ({
    id: id(),
    type: "paragraph" as const,
    text: `Preserved article page ${i + 1}`,
    breakBefore: i ? ("page" as const) : ("auto" as const),
  }));
  issue.sections[0].stories.push(story);
  return { issue, story };
}
test("headline fits exact lines, manual breaks stay independent, badge stays above and canonical TOC exports", async ({
  page,
  request,
}) => {
  const { issue, story } = fixture();
  story.headlineLayout = headlineLayoutSchema.parse({
    lines: 2,
    width: 80,
    align: "centre",
    manualText: "Across oceans\nTogether",
    fontSize: 34,
  });
  story.badge = storyBadgeSchema.parse({
    enabled: true,
    text: "People",
    background: "#223344",
    colour: "#FFDD00",
    radius: 3,
    fontSize: 10,
  });
  story.background = backgroundSchema.parse({
    mode: "solid",
    colour: "#FFFFFF",
    contrast: "light",
  });
  await render(page, issue);
  const opening = page.locator(`[data-story-id="${story.id}"]`).first();
  await expect(opening.locator(".story-title")).toHaveText(
    "Across oceans\nTogether",
  );
  await expect(opening.locator(".story-title")).toHaveAttribute(
    "data-headline-lines",
    "2",
  );
  await expect(page.locator(".toc-story-title")).toHaveText(story.title);
  await expect(page.locator(".toc-badge")).toHaveText("People");
  await expect(opening.locator(".story-badge")).toHaveCSS(
    "color",
    "rgb(255, 221, 0)",
  );
  await expect(opening.locator(".story-badge")).toHaveCSS(
    "background-color",
    "rgb(34, 51, 68)",
  );
  await expect(
    page
      .locator(`[data-story-id="${story.id}"]`)
      .nth(1)
      .locator(".story-badge,.story-title"),
  ).toHaveCount(0);
  const geometry = await opening.evaluate((node) => {
    const badge = node.querySelector(".story-badge")!.getBoundingClientRect();
    const title = node.querySelector(".story-title")!.getBoundingClientRect();
    return {
      bottom: badge.bottom,
      top: title.top,
      badgeCentre: badge.x + badge.width / 2,
      titleCentre: title.x + title.width / 2,
    };
  });
  expect(geometry.bottom).toBeLessThan(geometry.top);
  expect(geometry.badgeCentre).toBeCloseTo(geometry.titleCentre, 0);
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  await opening.screenshot({ path: "test-results/headline-opening.png" });
  await page
    .locator('.page[data-kind="contents"]')
    .first()
    .screenshot({ path: "test-results/contents-badge.png" });
  const response = await request.post("/api/export", { data: issue });
  expect(response.status()).toBe(200);
  await writeFile("test-results/headline-badge.pdf", await response.body());
  const font = parseFloat(
    await opening
      .locator(".story-title")
      .evaluate((el) => getComputedStyle(el).fontSize),
  );
  expect(font).toBeGreaterThanOrEqual((16 * 96) / 72);
  expect(font).toBeLessThanOrEqual((60 * 96) / 72);
});
test("impossible requested line count warns and blocks PDF without clipping", async ({
  page,
  request,
}) => {
  const { issue, story } = fixture();
  story.headlineLayout = headlineLayoutSchema.parse({
    lines: 1,
    manualText: "One\nTwo\nThree",
  });
  await render(page, issue);
  const title = page.locator(`[data-story-id="${story.id}"] .story-title`);
  await expect(title).toHaveText("One\nTwo\nThree");
  expect(
    (await page.evaluate(() => window.__magazineResult!.warnings)).join(" "),
  ).toContain("cannot fit 1 requested");
  await expect(title).toHaveCSS("overflow", "visible");
  const response = await request.post("/api/export", { data: issue });
  expect(response.status()).toBe(422);
});
test("image-relative positions, full-bleed edges and custom vertical position keep badge grouped", async ({
  page,
}) => {
  const { issue, story } = fixture();
  const bytes = await sharp({
    create: { width: 1600, height: 2400, channels: 3, background: "#b8d3e1" },
  })
    .jpeg()
    .toBuffer();
  issue.renderAssets = [
    {
      asset: {
        id: "photo",
        name: "fixture.jpg",
        mimeType: "image/jpeg",
        width: 1600,
        height: 2400,
        byteLength: bytes.length,
      },
      dataUrl: "data:image/jpeg;base64," + bytes.toString("base64"),
    },
  ];
  story.badge = storyBadgeSchema.parse({ enabled: true, text: "Field notes" });
  for (const [placement, coverage, headlinePlacement, expected] of [
    ["top", 35, "below", 107.95],
    ["bottom", 35, "above", null],
    ["top", 100, "below", null],
  ] as const) {
    story.background = backgroundSchema.parse({
      mode: "image",
      image: {
        assetId: "photo",
        alt: "Photo",
        focalPoint: { x: 0.5, y: 0.5 },
        fit: "cover",
      },
      coverage,
      placement,
    });
    story.headlineLayout = headlineLayoutSchema.parse({
      placement: headlinePlacement,
      fontSize: 24,
    });
    await render(page, issue);
    const result = await page
      .locator(`[data-story-id="${story.id}"]`)
      .first()
      .evaluate((node) => {
        const group = node
            .querySelector(".headline-group")!
            .getBoundingClientRect(),
          bounds = node.getBoundingClientRect();
        return {
          mm: ((group.top - bounds.top) * 210) / bounds.width,
          bottom: ((group.bottom - bounds.top) * 210) / bounds.width,
        };
      });
    if (expected !== null) expect(result.mm).toBeCloseTo(expected, 0);
    if (placement === "bottom") expect(result.bottom).toBeLessThan(193.1);
    if (coverage === 100) expect(result.bottom).toBeLessThan(268);
    expect(
      await page.evaluate(() => window.__magazineResult!.warnings),
    ).toEqual([]);
  }
  story.headlineLayout = headlineLayoutSchema.parse({
    placement: "custom",
    verticalMm: 100,
    width: 60,
    align: "right",
    fontSize: 24,
  });
  await render(page, issue);
  const y = await page
    .locator(`[data-story-id="${story.id}"] .headline-group`)
    .evaluate(
      (el) =>
        ((el.getBoundingClientRect().top -
          el.closest(".page")!.getBoundingClientRect().top) *
          210) /
        el.closest(".page")!.getBoundingClientRect().width,
    );
  expect(y).toBeCloseTo(100, 0);
  const sectionOpening = issue.sections[0].stories[0];
  sectionOpening.title = "Section introduction";
  sectionOpening.badge = storyBadgeSchema.parse({
    enabled: true,
    text: "Spotlight",
  });
  sectionOpening.background = story.background;
  sectionOpening.headlineLayout = headlineLayoutSchema.parse({
    placement: "above",
    fontSize: 24,
  });
  await render(page, issue);
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  sectionOpening.headlineLayout.verticalMm = 10;
  await render(page, issue);
  expect(
    (await page.evaluate(() => window.__magazineResult!.warnings)).join(" "),
  ).toContain("overlaps page furniture");
  sectionOpening.headlineLayout.verticalMm = undefined;
  const image = story.background!.image!;
  story.background = undefined;
  story.media = [image];
  for (const placement of ["above", "below"] as const) {
    story.headlineLayout = headlineLayoutSchema.parse({
      placement,
      fontSize: 24,
    });
    await render(page, issue);
    const geometry = await page
      .locator(`[data-story-id="${story.id}"]`)
      .first()
      .evaluate((node) => {
        const title = node
          .querySelector(".headline-group")!
          .getBoundingClientRect();
        const image = node
          .querySelector(".story-photo")!
          .getBoundingClientRect();
        return {
          titleTop: title.top,
          titleBottom: title.bottom,
          imageTop: image.top,
          imageBottom: image.bottom,
        };
      });
    if (placement === "above")
      expect(geometry.titleBottom).toBeLessThan(geometry.imageTop);
    else expect(geometry.imageBottom).toBeLessThan(geometry.titleTop);
    expect(
      await page.evaluate(() => window.__magazineResult!.warnings),
    ).toEqual([]);
  }
});

test("automatic fitting changes typography within bounds and badges paginate contents with real references", async ({
  page,
}) => {
  const { issue, story } = fixture();
  await render(page, issue);
  await expect(
    page.locator(`[data-story-id="${story.id}"] .headline-group`),
  ).toHaveCount(0);
  story.headlineLayout = headlineLayoutSchema.parse({
    lines: 2,
    width: 60,
    fontSize: 60,
  });
  await render(page, issue);
  let title = page.locator(`[data-story-id="${story.id}"] .story-title`);
  await expect(title).toHaveAttribute("data-headline-lines", "2");
  const fitted = await title.evaluate(
    (el) => (parseFloat(getComputedStyle(el).fontSize) * 72) / 96,
  );
  expect(fitted).toBeLessThan(60);
  expect(fitted).toBeGreaterThanOrEqual(16);
  story.headlineLayout.lines = "auto";
  story.headlineLayout.fontSize = 24;
  story.headlineLayout.manualText = "One\nTwo\nThree\nFour";
  await render(page, issue);
  title = page.locator(`[data-story-id="${story.id}"] .story-title`);
  await expect(title).toHaveAttribute("data-headline-lines", "4");
  expect(
    await title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeCloseTo(32, 0);
  story.headlineLayout = undefined;
  for (let i = 0; i < 40; i++) {
    const extra = newStory();
    extra.title = `Indexed story ${i + 1}: connections across the world`;
    extra.badge = storyBadgeSchema.parse({
      enabled: true,
      text: `Editorial desk ${i + 1}`,
    });
    issue.sections[0].stories.push(extra);
  }
  await render(page, issue);
  const contents = page.locator('.page[data-kind="contents"]');
  expect(await contents.count()).toBeGreaterThan(1);
  const verification = await page.evaluate(() => {
    const pages = Array.from(
      document.querySelectorAll<HTMLElement>("#pages>.page"),
    );
    const front = pages.filter((p) => p.dataset.kind === "contents").length + 1;
    const first = pages[front];
    const entries = Array.from(document.querySelectorAll(".toc-row")).filter(
      (row) => row.querySelector(".toc-badge"),
    );
    return {
      contiguous: pages
        .slice(1, front)
        .every((p) => p.dataset.kind === "contents"),
      firstFolio: first.dataset.folio,
      correct: entries.every((row) => {
        const title = row.querySelector(".toc-story-title")!.textContent;
        const page = pages.find(
          (p) => p.querySelector(".story-title")?.textContent === title,
        );
        return (
          row.querySelector(".toc-number")!.textContent ===
          page?.dataset.folio?.padStart(2, "0")
        );
      }),
    };
  });
  expect(verification).toEqual({
    contiguous: true,
    firstFolio: "1",
    correct: true,
  });
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
});
