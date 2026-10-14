/** Run: python3 scripts/reference-proof-assets.py
 * then node_modules/.bin/vite-node scripts/generate-phase3b-proof.ts
 * Reference artwork is for comparison only; no assets are added to the app defaults.
 */
import { chromium } from "playwright";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { sampleIssue } from "../src/domain/sample";
import { magazineDocument } from "../src/magazine/document";
import { migrateIssue } from "../src/domain/issue";
const issue = structuredClone(sampleIssue);
const ref = (assetId: string, alt: string) => ({
  assetId,
  alt,
  caption: "",
  credit: "Reference Volume 20 artwork · comparison proof only",
  focalPoint: { x: 0.5, y: 0.5 },
  fit: "cover" as const,
});
issue.cover = {
  headline: "Connections that move us",
  supportingText: "A local editorial demonstration",
  edition: "FORTNIGHTLY EDITION",
  surface: "white",
  image: ref(
    "cover-reference",
    "Original Volume 20 cover photograph; reference-only proof",
  ),
  logo: {
    ...ref(
      "logo-reference",
      "ECU Worldwide logo rasterized for reference comparison only",
    ),
    fit: "contain",
  },
};
issue.sections[0].template = "opener";
issue.sections[0].stories[0].visual = {
  thumbnailShape: "portrait",
  summary:
    "A fictional editorial introduction, using original artwork only for visual comparison.",
  position: "below",
  heroLayout: "large",
  hero: ref(
    "opener-reference",
    "Original Volume 20 opener photograph; reference-only proof",
  ),
  thumbnail: ref(
    "contents-reference",
    "Original Volume 20 thumbnail; reference-only proof",
  ),
};
issue.renderAssets = JSON.parse(
  await readFile(join(tmpdir(), "ecu-phase3b-proof-assets.json"), "utf8"),
);
const parsed = migrateIssue(issue);
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
  await page.setContent(magazineDocument(parsed));
  await page.waitForFunction(() => window.__magazineReady);
  const result = await page.evaluate(() => window.__magazineResult!);
  console.log(JSON.stringify(result, null, 2));
  if (result.warnings.length) throw new Error(result.warnings.join(" "));
  await mkdir("docs/previews", { recursive: true });
  for (const [name, selector] of [
    ["cover", ".cover"],
    ["contents", ".contents"],
    ["opener", ".opener"],
  ])
    await page
      .locator(selector)
      .first()
      .screenshot({ path: `docs/previews/phase3b-${name}.png` });
  await writeFile(
    "public/previews/ecu-phase3b-visual-templates.pdf",
    await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    }),
  );
  await writeFile(
    join(tmpdir(), "ecu-phase3b-proof-issue.json"),
    JSON.stringify(parsed),
  );
} finally {
  await browser.close();
}
