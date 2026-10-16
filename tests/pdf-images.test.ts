import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { newIssue, newSection } from "../src/domain/issue";
import { MemoryMediaAssetRepository } from "../src/media/repository";
import { pdfFormData } from "../src/media/pdf-client";
import { readPdfInput, optimizePdfImages } from "../src/export/pdf-images";
import { prepareRenderIssue } from "../src/media/render";
async function fixture(
  bytes: Buffer,
  width: number,
  height: number,
  mimeType: "image/png" | "image/jpeg" = "image/png",
) {
  const issue = newIssue("Print export", 22);
  issue.sections = [newSection("Cover Story")];
  const repo = new MemoryMediaAssetRepository();
  await repo.put({
    asset: {
      id: "original",
      name: "photo.png",
      mimeType,
      width,
      height,
      byteLength: bytes.length,
    },
    bytes,
  });
  issue.cover = {
    headline: "Native PDF text",
    supportingText: "",
    edition: "EDITION",
    surface: "white",
    image: {
      assetId: "original",
      alt: "Photo",
      caption: "",
      credit: "",
      focalPoint: { x: 0.5, y: 0.5 },
    },
  };
  return { issue, repo };
}
describe("binary print-quality PDF transport", () => {
  it("accepts binary requests above 1 MB, sends shared bytes once and preserves originals", async () => {
    const raw = Buffer.alloc(800 * 800 * 3);
    let seed = 42;
    for (let i = 0; i < raw.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      raw[i] = seed >>> 24;
    }
    const bytes = await sharp(raw, {
      raw: { width: 800, height: 800, channels: 3 },
    })
      .png()
      .toBuffer();
    expect(bytes.length).toBeGreaterThan(1_000_000);
    const { issue, repo } = await fixture(bytes, 800, 800);
    issue.cover!.logo = issue.cover!.image;
    const form = await pdfFormData(issue, repo);
    expect(
      [...form.keys()].filter((key) => key.startsWith("image:")),
    ).toHaveLength(1);
    const request = new Request("http://localhost/api/export", {
      method: "POST",
      body: form,
    });
    expect((await request.clone().arrayBuffer()).byteLength).toBeGreaterThan(
      1_000_000,
    );
    const optimized = await readPdfInput(request);
    expect(optimized.renderAssets).toHaveLength(1);
    expect(optimized.cover).toEqual(issue.cover);
    expect(Buffer.from((await repo.get("original"))!.bytes).equals(bytes)).toBe(
      true,
    );
    // Backward-compatible JSON transport also has no artificial 1 MB rejection.
    const legacy = await prepareRenderIssue(issue, repo);
    expect(JSON.stringify(legacy).length).toBeGreaterThan(1_000_000);
    expect(
      (
        await readPdfInput(
          new Request("http://localhost/api/export", {
            method: "POST",
            body: JSON.stringify(legacy),
          }),
        )
      ).renderAssets,
    ).toHaveLength(1);
  });
  it("optimizes print copies conservatively while preserving alpha, aspect ratio and canonical text", async () => {
    const svg = Buffer.from(
      '<svg width="4000" height="5000" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop stop-color="#034EA2"/><stop offset="1" stop-color="#FFDD00"/></linearGradient></defs><rect width="4000" height="5000" fill="url(#g)"/></svg>',
    );
    const bytes = await sharp(svg).jpeg({ quality: 100 }).toBuffer();
    const { issue, repo } = await fixture(bytes, 4000, 5000, "image/jpeg");
    const optimized = await optimizePdfImages(
      await prepareRenderIssue(issue, repo),
    );
    const asset = optimized.renderAssets![0].asset;
    expect(asset.width).toBeGreaterThanOrEqual(2480);
    expect(asset.height).toBeGreaterThanOrEqual(3508);
    expect(asset.width / asset.height).toBeCloseTo(0.8, 3);
    expect(asset.byteLength).toBeLessThanOrEqual(bytes.length);
    expect(optimized.cover!.headline).toBe("Native PDF text");
    expect(Buffer.from((await repo.get("original"))!.bytes).equals(bytes)).toBe(
      true,
    );
    const alpha = await sharp({
      create: {
        width: 40,
        height: 30,
        channels: 4,
        background: { r: 3, g: 78, b: 162, alpha: 0.25 },
      },
    })
      .png()
      .toBuffer();
    const transparent = await fixture(alpha, 40, 30);
    const result = await readPdfInput(
      new Request("http://localhost", {
        method: "POST",
        body: await pdfFormData(transparent.issue, transparent.repo),
      }),
    );
    const decoded = Buffer.from(
      result.renderAssets![0].dataUrl.split(",")[1],
      "base64",
    );
    expect((await sharp(decoded).metadata()).hasAlpha).toBe(true);
  });
  it("rejects missing or invalid binary assets with useful errors, rather than size gates", async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    const { issue, repo } = await fixture(png, 2, 2);
    const form = await pdfFormData(issue, repo);
    form.delete("image:original");
    await expect(
      readPdfInput(
        new Request("http://localhost", { method: "POST", body: form }),
      ),
    ).rejects.toThrow("missing or incomplete");
    await repo.remove("original");
    await expect(pdfFormData(issue, repo)).rejects.toThrow(
      "missing from this browser",
    );
  });
});
