import { test, expect } from "@playwright/test";
import { sampleIssue } from "../src/domain/sample";
import { magazineDocument } from "../src/magazine/document";
import { newStory } from "../src/domain/issue";
import { readFileSync } from "node:fs";

test("T04 mixed figures retain captions, order and PDF export", async ({
  page,
  request,
}) => {
  const issue = editorialIssue(1, 4);
  const bytes = readFileSync("tests/fixtures/crop-calibration.png");
  issue.renderAssets = [
    {
      asset: {
        id: "inline-test",
        name: "Test-only calibration",
        mimeType: "image/png",
        width: 320,
        height: 200,
        byteLength: bytes.length,
      },
      dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
    },
  ];
  const story = issue.sections[0].stories[0];
  for (const i of [1, 3])
    story.blocks.splice(i, 0, {
      id: `figure-${i}`,
      type: "figure",
      text: `Figure ${i} caption`,
      figureHeightMm: 90,
      image: {
        assetId: "inline-test",
        alt: `Test figure ${i}`,
        caption: "Associated caption",
        credit: "Test credit",
        fit: "contain",
        focalPoint: { x: 0.5, y: 0.5 },
      },
    });
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  await expect(page.locator(".editorial-figure")).toHaveCount(2);
  for (const figure of await page.locator(".editorial-figure").all()) {
    await expect(figure.locator("img")).toHaveCSS("object-fit", "contain");
    await expect(figure.locator("figcaption")).toContainText(
      "Associated caption · Test credit",
    );
  }
  const response = await request.post("/api/export", { data: issue });
  expect(response.status()).toBe(200);
});

function editorialIssue(columns: 1 | 2, repeats = 5) {
  const issue = structuredClone(sampleIssue);
  const story = newStory();
  story.title = "T04 editorial test";
  story.template = "t04";
  story.editorial = { columns, showTitle: false };
  story.blocks = [
    { id: "first-heading", type: "heading", text: "Editorial heading" },
    ...Array.from({ length: repeats }, (_, i) => ({
      id: `body-${i}`,
      type: "paragraph" as const,
      text:
        `Paragraph ${i}. ` +
        "A measured editorial paragraph preserves every word and its reading order. ".repeat(
          12,
        ),
    })),
  ];
  issue.sections = [{ ...issue.sections[0], stories: [story] }];
  return issue;
}

for (const columns of [1, 2] as const) {
  for (const [length, count] of [
    ["short", 1],
    ["medium", 6],
    ["long", 24],
  ] as const) {
    test(`T04 ${columns} columns ${length}: text, folios and real PDF`, async ({
      page,
      request,
    }) => {
      const issue = editorialIssue(columns, count);
      await page.setContent(magazineDocument(issue));
      await page.waitForFunction(() => window.__magazineReady);
      const result = await page.evaluate(() => window.__magazineResult!);
      expect(result.warnings).toEqual([]);
      const actual = (await page.locator(".editorial-column").allTextContents())
        .join("")
        .replace(/\s+/g, "");
      expect(actual).toBe(
        issue.sections[0].stories[0].blocks
          .map((b) => b.text)
          .join("")
          .replace(/\s+/g, ""),
      );
      expect(
        await page
          .locator(".page[data-kind=article] .page-number")
          .allTextContents(),
      ).toEqual(
        Array.from({ length: result.pages - 2 }, (_, i) => String(i + 1)),
      );
      for (const region of await page.locator(".editorial-region").all())
        expect(await region.getAttribute("data-columns")).toBe(String(columns));
      const response = await request.post("/api/export", { data: issue });
      expect(response.status()).toBe(200);
      expect((await response.body()).subarray(0, 4).toString()).toBe("%PDF");
    });
  }
}

test("T04 explicit column break and fixed-block overflow are visible and block PDF", async ({
  page,
  request,
}) => {
  const issue = editorialIssue(2, 1);
  const story = issue.sections[0].stories[0];
  story.blocks.push({
    id: "right",
    type: "paragraph",
    text: "Right column starts here.",
    breakBefore: "column",
  });
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  await expect(page.locator(".editorial-column").nth(1)).toContainText(
    "Right column starts here.",
  );
  story.blocks.push({
    id: "too-tall",
    type: "callout",
    text: "Unsplit approved callout. ".repeat(500),
  });
  await page.goto("about:blank");
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  expect(
    (await page.evaluate(() => window.__magazineResult!.warnings)).join(" "),
  ).toContain("cannot fit");
  await expect(page.locator(".callout")).toContainText(
    "Unsplit approved callout.",
  );
  const response = await request.post("/api/export", { data: issue });
  expect(response.status()).toBe(422);
});

test("T04 editor controls persist without losing ordered blocks", async ({
  page,
}) => {
  const issue = editorialIssue(1, 1);
  await page.addInitScript((data) => {
    if (!localStorage.getItem("ecu-connect:issues:v1"))
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, issue);
  await page.goto(`/issues/${issue.id}`);
  await page.getByText("Advanced Layout", { exact: true }).click();
  await page.getByLabel("Article Columns").selectOption("2");
  await page.getByLabel("Block 2 break before").selectOption("column");
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await page.reload();
  await page.getByText("Advanced Layout", { exact: true }).click();
  await expect(page.getByLabel("Article Columns")).toHaveValue("2");
  await expect(page.getByLabel("Block 2 break before")).toHaveValue("column");
});
