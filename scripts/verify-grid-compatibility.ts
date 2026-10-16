/** Run with npx vite-node scripts/verify-grid-compatibility.ts. Uses the preserved local baseline. */
import { chromium } from "playwright";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { magazineDocument } from "../src/magazine/document";
import { sampleIssue } from "../src/domain/sample";
import { templateRegistry } from "../src/magazine/templates";
const { magazineDocument: baseline } = await import(
  resolve(
    process.env.PDF_BASELINE_DIR ?? ".cache/studio-baseline",
    "src/magazine/document.ts",
  )
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
});
const normalize = (bytes: Buffer) =>
  bytes
    .toString("latin1")
    .replace(/D:\d{14}(?:Z|[+-]\d{2}'\d{2}')/g, "D:00000000000000Z");
const results = [];
try {
  for (const template of Object.keys(templateRegistry) as Array<
    keyof typeof templateRegistry
  >) {
    const issue = structuredClone(sampleIssue);
    issue.sections = issue.sections.slice(0, 1);
    const story = issue.sections[0].stories[0];
    story.template = template;
    story.editorial = { columns: 2, showTitle: true };
    const pdfs = [];
    const layouts = [];
    for (const html of [
      baseline(issue, "compatibility"),
      magazineDocument(issue, "compatibility"),
    ]) {
      const page = await browser.newPage();
      await page.route("**/*", (r) => r.abort());
      await page.setContent(html);
      await page.waitForFunction(() => window.__magazineReady);
      layouts.push(await page.evaluate(() => window.__magazineResult));
      pdfs.push(
        await page.pdf({
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
        }),
      );
      await page.close();
    }
    if (normalize(pdfs[0]) !== normalize(pdfs[1]))
      throw Error("PDF regression for " + template);
    if (JSON.stringify(layouts[0]) !== JSON.stringify(layouts[1]))
      throw Error("Pagination regression for " + template);
    results.push({
      template,
      identicalPdfExceptTimestamps: true,
      identicalPagination: true,
      pdfBytes: pdfs.map((b) => b.length),
    });
  }
  const evidence = {
    baselineCommit: "70579d3d37743c699e11c8feb3fe23a0f58b57dd",
    results,
  };
  await writeFile(
    "docs/grid-compatibility.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
