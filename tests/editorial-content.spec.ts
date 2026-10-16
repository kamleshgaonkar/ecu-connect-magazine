import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import {
  newIssue,
  newSection,
  id,
  type Issue,
  type Block,
} from "../src/domain/issue";
import {
  newComponent,
  newTableCell,
  componentText,
  type TableComponent,
} from "../src/domain/content";
import { magazineDocument } from "../src/magazine/document";
import { backgroundSchema } from "../src/domain/background";
import { initialGrid } from "../src/studio/grid-layout";
async function render(page: Page, issue: Issue) {
  await page.goto("about:blank");
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
}
function fixture() {
  const issue = newIssue("Editorial components verification", 24);
  issue.sample = true;
  issue.sections = [newSection("Cover Story")];
  const story = issue.sections[0].stories[0];
  story.contentMode = "continuous";
  story.title = "Editorial verification";
  story.byline = "Sample Contributor | contributor@example.test";
  return { issue, story };
}
async function portrait(issue: Issue) {
  const bytes = await sharp(
    Buffer.from(
      '<svg width="700" height="1000" xmlns="http://www.w3.org/2000/svg"><ellipse cx="350" cy="230" rx="150" ry="190" fill="#918075"/><path d="M100 1000L130 500Q350 340 570 500L650 1000Z" fill="#33465e"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  issue.renderAssets = [
    {
      asset: {
        id: "portrait",
        name: "synthetic-portrait.png",
        mimeType: "image/png",
        width: 700,
        height: 1000,
        byteLength: bytes.length,
      },
      dataUrl: "data:image/png;base64," + bytes.toString("base64"),
    },
  ];
  return {
    assetId: "portrait",
    alt: "Synthetic portrait fixture",
    caption: "",
    credit: "",
    focalPoint: { x: 0.5, y: 0.5 },
    fit: "contain" as const,
  };
}
for (const grid of [false, true])
  test(`tables split only by rows, repeat headers and preserve links in ${grid ? "saved grids" : "automatic pages"}`, async ({
    page,
    request,
  }) => {
    const { issue, story } = fixture();
    const component = newComponent("table") as TableComponent;
    component.rows = Array.from({ length: 65 }, (_, index) => ({
      id: id(),
      cells: [
        {
          ...newTableCell(),
          content: {
            runs: [
              { text: index ? `Row ${index}` : "Column one", bold: !index },
            ],
            align: "left" as const,
          },
        },
        {
          ...newTableCell(),
          content: {
            runs: [
              {
                text: index ? "Visit editorial page" : "Column two",
                href: "https://example.test/editorial",
              },
            ],
            align: "center" as const,
          },
        },
      ],
    }));
    story.blocks = [
      {
        id: id(),
        type: "paragraph",
        text: componentText(component),
        component,
      },
    ];
    if (grid) story.grid = initialGrid(story);
    await render(page, issue);
    const pages = page.locator(`[data-story-id="${story.id}"]`);
    expect(await pages.count()).toBeGreaterThan(1);
    const tables = page.locator(".ecu-table table");
    expect(await tables.count()).toBeGreaterThan(1);
    for (let n = 0; n < (await tables.count()); n++)
      await expect(tables.nth(n).locator("thead")).toHaveText(
        "Column oneColumn two",
      );
    expect(await tables.locator("tbody tr").count()).toBe(64);
    expect(
      await tables.locator("tbody td:first-child").allTextContents(),
    ).toEqual(Array.from({ length: 64 }, (_, n) => `Row ${n + 1}`));
    expect(
      await page.evaluate(() => window.__magazineResult!.warnings),
    ).toEqual([]);
    const response = await request.post("/api/export", { data: issue });
    expect(response.status()).toBe(200);
  });
test("two approved quote presets, wrapped employee profiles, CTA/info and final credit share preview/PDF rendering", async ({
  page,
  request,
}) => {
  const { issue, story } = fixture();
  story.background = backgroundSchema.parse({
    mode: "solid",
    colour: "#F0F7FA",
    contrast: "original",
  });
  const image = await portrait(issue);
  const quote = newComponent("testimonial");
  if (quote.kind !== "testimonial") throw Error();
  Object.assign(quote, {
    quote:
      "This synthetic editorial quotation verifies the approved card composition without making a company announcement.",
    name: "Sample Contributor",
    designation: "Test designation",
    company: "Example location",
  });
  const profile = newComponent("profile");
  if (profile.kind !== "profile") throw Error();
  Object.assign(profile, {
    name: "Profile fixture",
    designation: "Test designation",
    company: "Example location",
  });
  const cta = newComponent("cta");
  if (cta.kind !== "cta") throw Error();
  Object.assign(cta, {
    heading: "Editorial link fixture",
    href: "https://example.test/editorial",
    linkLabel: "Read the test page",
    content: {
      runs: [{ text: "A formatted test description.", bold: true }],
      align: "left",
    },
  });
  const info = newComponent("info");
  if (info.kind !== "info") throw Error();
  Object.assign(info, {
    heading: "Contact fixture",
    content: {
      runs: [
        {
          text: "editorial@example.test",
          href: "mailto:editorial@example.test",
          underline: true,
        },
      ],
      align: "left",
    },
  });
  const paragraph: Block = {
    id: id(),
    type: "paragraph",
    text: "Body text wraps alongside the employee portrait, then continues at full width below it. ".repeat(
      70,
    ),
    rich: {
      runs: [
        {
          text: "Body text wraps alongside the employee portrait, then continues at full width below it. ".repeat(
            70,
          ),
        },
      ],
      align: "left",
    },
  };
  story.blocks = [
    {
      id: id(),
      type: "quote",
      text: componentText(quote),
      component: quote,
      image: { ...image, fit: "cover" },
    },
    {
      id: id(),
      type: "quote",
      text: componentText(quote),
      component: { ...quote, preset: "executive" },
      image,
    },
    {
      id: id(),
      type: "paragraph",
      text: componentText(profile),
      component: profile,
      image,
    },
    paragraph,
    {
      id: id(),
      type: "paragraph",
      text: componentText(profile),
      component: { ...profile, name: "Second profile fixture" },
      image,
    },
    { id: id(), type: "paragraph", text: "Additional narrative." },
    { id: id(), type: "callout", text: componentText(cta), component: cta },
    { id: id(), type: "callout", text: componentText(info), component: info },
  ];
  await render(page, issue);
  await expect(page.locator(".ecu-quote-compact")).toHaveCount(1);
  await expect(page.locator(".ecu-quote-executive")).toHaveCount(1);
  await expect(page.locator(".ecu-quote-compact .ecu-quote-photo")).toHaveCSS(
    "border-radius",
    "50%",
  );
  await expect(
    page.locator(".ecu-quote-executive .ecu-quote-circle"),
  ).toHaveCount(2);
  const wrap = await page
    .locator(`[data-content-id="${paragraph.id}"]`)
    .first()
    .evaluate((node) => {
      const r = document.createRange();
      r.selectNodeContents(node);
      const rects = Array.from(r.getClientRects());
      const profile = node.previousElementSibling!.getBoundingClientRect();
      return {
        first: rects[0].left,
        last: rects.at(-1)!.left,
        portraitRight: profile.right,
      };
    });
  expect(wrap.first).toBeGreaterThan(wrap.portraitRight);
  expect(wrap.last).toBeLessThan(wrap.portraitRight);
  await expect(page.locator(".ecu-cta-link")).toHaveAttribute(
    "href",
    "https://example.test/editorial",
  );
  await expect(page.locator(".ecu-info a")).toHaveAttribute(
    "href",
    "mailto:editorial@example.test",
  );
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  await page
    .locator(`[data-story-id="${story.id}"]`)
    .first()
    .screenshot({ path: "test-results/continuous-opening.png" });
  await page
    .locator(".ecu-quote-compact")
    .screenshot({ path: "test-results/compact-quote.png" });
  await page
    .locator(".ecu-quote-executive")
    .screenshot({ path: "test-results/executive-quote.png" });
  const response = await request.post("/api/export", { data: issue });
  expect(response.status()).toBe(200);
  await writeFile(
    "test-results/continuous-editorial.pdf",
    await response.body(),
  );
  await expect(
    page
      .locator(`[data-story-id="${story.id}"]`)
      .last()
      .locator(".story-author-credit"),
  ).toHaveText(story.byline);
});

test("images and captions move together; oversized components warn without clipping or losing data", async ({
  page,
  request,
}) => {
  const { issue, story } = fixture();
  const image = await portrait(issue);
  const text = "Measured narrative before the inline photograph. ".repeat(90);
  story.blocks = [
    {
      id: id(),
      type: "paragraph",
      text,
      rich: { runs: [{ text }], align: "left" },
    },
    {
      id: id(),
      type: "figure",
      text: "Caption remains attached to the photograph.",
      image,
      figureHeightMm: 110,
    },
  ];
  await render(page, issue);
  const pages = page.locator(`[data-story-id="${story.id}"]`);
  expect(await pages.count()).toBeGreaterThan(1);
  await expect(pages.first().locator(".ecu-content-image")).toHaveCount(0);
  await expect(pages.locator(".ecu-content-image")).toHaveCount(1);
  await expect(pages.locator(".ecu-content-image figcaption")).toHaveText(
    "Caption remains attached to the photograph.",
  );
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  const quote = newComponent("testimonial");
  if (quote.kind !== "testimonial") throw Error();
  quote.quote = "An oversized test quotation. ".repeat(500);
  story.blocks = [
    {
      id: id(),
      type: "quote",
      text: componentText(quote),
      component: quote,
      image,
    },
  ];
  await render(page, issue);
  await expect(page.locator(".ecu-quote-text").last()).toHaveText(quote.quote);
  expect(
    (await page.evaluate(() => window.__magazineResult!.warnings)).join(" "),
  ).toContain("cannot fit");
  expect((await request.post("/api/export", { data: issue })).status()).toBe(
    422,
  );
});

test("numbered lists keep their numbering and text when measured pagination splits them", async ({
  page,
}) => {
  const { issue, story } = fixture();
  const items = Array.from({ length: 100 }, (_, index) => ({
    runs: [
      {
        text:
          `Item ${index + 1}: ` +
          "A preserved list entry with italic emphasis. ".repeat(4),
        italic: true,
      },
    ],
    align: "left" as const,
  }));
  story.blocks = [
    {
      id: id(),
      type: "list",
      text: items.map((item) => item.runs[0].text).join("\n"),
      rich: { runs: [], ordered: true, align: "left", items },
    },
  ];
  await render(page, issue);
  const lists = page.locator("ol.ecu-content-text");
  expect(await lists.count()).toBeGreaterThan(1);
  const values = await lists.evaluateAll((nodes) =>
    nodes.flatMap((node) =>
      Array.from(node.children).map((item, index) => ({
        number: Number(node.getAttribute("start") ?? 1) + index,
        hidden: (item as HTMLElement).style.listStyleType === "none",
        text: item.textContent ?? "",
      })),
    ),
  );
  expect(values.map((item) => item.text).join("")).toBe(
    items.map((item) => item.runs[0].text).join(""),
  );
  const numbered = values.filter((item) => !item.hidden);
  expect(numbered.map((item) => item.number)).toEqual(
    Array.from({ length: 100 }, (_, index) => index + 1),
  );
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
});
