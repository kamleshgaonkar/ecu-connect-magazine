/** Run reference-data Python script first; then npx vite-node scripts/generate-phase3c-proof.ts. */
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { newIssue, newStory, type Block } from "../src/domain/issue";
import { magazineDocument } from "../src/magazine/document";
const data = JSON.parse(
  await readFile("tmp/pdfs/phase3c/reference-data.json", "utf8"),
);
const issue = newIssue("Phase 3C reference comparison", 20);
issue.date = "September 28, 2026";
issue.sample = true;
const full = newStory();
full.title = "V20 p4 — reference comparison only";
full.template = "t04";
full.editorial = { columns: 1, showTitle: false };
full.blocks = [
  {
    id: "reference-chart",
    type: "figure",
    text: data.figureCaption,
    figureHeightMm: 102,
    image: {
      assetId: "v20-chart-reference",
      alt: "Historical V20 p4 chart, comparison only",
      caption: "",
      credit: "",
      fit: "contain",
      focalPoint: { x: 0.5, y: 0.5 },
    },
  },
  { id: "reference-callout", type: "callout", text: data.callout },
  ...data.blocks.map((b: Block, i: number) => ({ ...b, id: `reference-${i}` })),
];
const columns = newStory();
columns.title = "V17 p12 — narrative region comparison";
columns.template = "t04";
columns.editorial = { columns: 2, showTitle: false };
columns.blocks = [
  { id: "cargo-heading", type: "heading", text: "Key cargo airlines" },
  {
    id: "cargo-intro",
    type: "paragraph",
    text: "Major cargo operators include:",
  },
  {
    id: "cargo-list",
    type: "list",
    text: "Atlas Air\nKalitta Air\nABX Air\nAmerijet International\nNational Airlines",
  },
  {
    id: "cargo-description",
    type: "paragraph",
    text: "These carriers provide ACMI services, charter operations, military logistics, and scheduled freight services.",
  },
  {
    id: "forwarders-heading",
    type: "heading",
    text: "Leading freight forwarders",
  },
  {
    id: "forwarders-intro",
    type: "paragraph",
    text: "Some of the largest logistics providers operating in the US include:",
  },
  {
    id: "forwarders-list",
    type: "list",
    text: "Kuehne+Nagel\nDSV\nDB Schenker\nExpeditors International\nC.H. Robinson",
  },
  {
    id: "passenger-intro",
    type: "paragraph",
    breakBefore: "column",
    text: "In addition to dedicated freighters, **several passenger airlines** transport significant cargo in the belly hold of passenger aircraft, including:",
  },
  {
    id: "passenger-list",
    type: "list",
    text: "United Airlines\nDelta Air Lines\nAmerican Airlines\nAlaska Airlines\nHawaiian Airlines\nMajor air cargo hubs",
  },
  {
    id: "gateways",
    type: "paragraph",
    text: "Key US air cargo gateways include — **Memphis, Louisville, Anchorage, Cincinnati/Northern Kentucky, Chicago O’Hare, Miami, New York (JFK), and Los Angeles.**",
  },
  {
    id: "anchorage",
    type: "paragraph",
    text: "Among these, Anchorage handles the highest cargo volume by weight, owing to its strategic location as a refueling hub for trans-Pacific operations.",
  },
];
issue.sections = [
  {
    id: "cover-story-reference",
    name: "Cover Story",
    enabled: true,
    template: "t04",
    theme: "inherit",
    stories: [full],
  },
  {
    id: "whats-up-reference",
    name: "What's Up @ ECU Worldwide",
    enabled: true,
    template: "t04",
    theme: "air-blue",
    stories: [columns],
  },
];
issue.renderAssets = [data.asset];
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_EXECUTABLE_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 1300 },
    deviceScaleFactor: 1.25,
  });
  await page.route("**/*", (r) => r.abort());
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  const result = await page.evaluate(() => window.__magazineResult!);
  console.log(JSON.stringify(result, null, 2));
  if (result.warnings.length) {
    console.log(
      await page
        .locator(".cover-meta,.cover-meta span,.cover-brand")
        .evaluateAll((nodes) =>
          nodes.map((n) => ({
            cls: n.className,
            w: n.clientWidth,
            sw: n.scrollWidth,
            h: n.clientHeight,
            sh: n.scrollHeight,
            font: getComputedStyle(n).fontFamily,
          })),
        ),
    );
    await page
      .locator(".cover")
      .screenshot({ path: "tmp/pdfs/phase3c/cover-debug.png" });
    throw new Error(result.warnings.join(" "));
  }
  await mkdir("docs/previews/phase3c", { recursive: true });
  for (const [index, name] of ["full-width", "two-column"].entries()) {
    await page
      .locator(`.page[data-story-id="${index ? columns.id : full.id}"]`)
      .first()
      .screenshot({ path: `docs/previews/phase3c/generated-${name}.png` });
  }
  await writeFile(
    "public/previews/ecu-phase3c-editorial.pdf",
    await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    }),
  );
  await writeFile("tmp/pdfs/phase3c/proof-issue.json", JSON.stringify(issue));
} finally {
  await browser.close();
}
