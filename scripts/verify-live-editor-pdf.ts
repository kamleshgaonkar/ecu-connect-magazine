/** Compare the unchanged Phase 3C renderer with this branch using one Chromium.
 * Setup: git archive 455e186 src/domain src/magazine -> .cache/live-baseline.
 * Run: npx vite-node scripts/verify-live-editor-pdf.ts
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { magazineDocument } from "../src/magazine/document";
import { sampleIssue } from "../src/domain/sample";
import { withPreviewControls } from "../src/components/preview-document";
const baselinePath = resolve(
  process.env.PDF_BASELINE_DIR || ".cache/live-baseline",
  "src/magazine/document.ts",
);
const { magazineDocument: baselineDocument } = await import(baselinePath);
const issue = structuredClone(sampleIssue);
const baseline = baselineDocument(issue, "identical-input");
const current = magazineDocument(issue, "identical-input");
if (baseline !== current)
  throw new Error("Magazine document differs from Phase 3C baseline");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
});
try {
  const buffers: Buffer[] = [];
  for (const html of [
    baseline,
    withPreviewControls(current, "identical-input"),
  ]) {
    const page = await browser.newPage();
    await page.route("**/*", (route) => route.abort());
    await page.setContent(html);
    await page.waitForFunction(() => window.__magazineReady);
    const result = await page.evaluate(() => window.__magazineResult!);
    if (result.warnings.length) throw new Error(result.warnings.join(" "));
    // The bridge does not scale until the parent requests it. PDF export never loads it.
    buffers.push(
      await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      }),
    );
    await page.close();
  }
  const normalize = (value: Buffer) =>
    value
      .toString("latin1")
      .replace(/D:\d{14}(?:Z|[+-]\d{2}'\d{2}')/g, "D:00000000000000Z");
  if (normalize(buffers[0]) !== normalize(buffers[1]))
    throw new Error(
      "PDF visual/content bytes changed (after timestamp normalization)",
    );
  const evidence = {
    baselineCommit:
      process.env.PDF_BASELINE_COMMIT ||
      "455e186735d8743b214534e109245af82da6a073",
    identicalHtml: true,
    identicalPdfExceptTimestamps: true,
    htmlSha256: createHash("sha256").update(current).digest("hex"),
    pdfBytes: buffers.map((b) => b.length),
  };
  await mkdir(".cache/live-editor-validation", { recursive: true });
  await writeFile(
    ".cache/live-editor-validation/pdf-invariance.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
