import sharp from "sharp";
import { createHash } from "node:crypto";
import { z } from "zod";
import { migrateIssue, type Issue } from "../domain/issue";
import {
  mediaAssetSchema,
  type MediaAsset,
  type RenderAsset,
} from "../domain/media";
import { issueMediaReferences } from "../media/render";
export class PdfInputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
/** Route Handlers have no Server Action 1 MB body limit. Supports old JSON clients as well. */
export async function readPdfInput(request: Request): Promise<Issue> {
  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    try {
      const issue = migrateIssue(await request.json());
      return await optimizePdfImages(issue);
    } catch (error) {
      if (error instanceof PdfInputError) throw error;
      throw new PdfInputError(
        "Invalid issue JSON or unsupported content. Your saved magazine has not been changed.",
      );
    }
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new PdfInputError(
      "Unable to read the image upload. Check the server/proxy upload configuration and retry.",
    );
  }
  let issue: Issue, assets: MediaAsset[];
  try {
    issue = migrateIssue(JSON.parse(String(form.get("issue"))));
    assets = z
      .array(mediaAssetSchema)
      .parse(JSON.parse(String(form.get("assets"))));
  } catch {
    throw new PdfInputError(
      "Invalid magazine or image metadata in PDF upload.",
    );
  }
  const renderAssets: RenderAsset[] = [];
  const cache: OptimizationCache = new Map();
  const used = new Set(
    issueMediaReferences(issue).map((reference) => reference.assetId),
  );
  const seen = new Set<string>();
  for (const asset of assets) {
    if (seen.has(asset.id))
      throw new PdfInputError("Duplicate image ID in PDF upload.");
    seen.add(asset.id);
    const file = form.get(`image:${asset.id}`);
    if (
      !file ||
      typeof file === "string" ||
      file.size !== asset.byteLength ||
      file.type !== asset.mimeType
    )
      throw new PdfInputError(
        `Image upload is missing or incomplete: ${asset.name}. Retry the export.`,
      );
    if (used.has(asset.id))
      renderAssets.push(
        await optimizedRenderAsset(
          asset,
          Buffer.from(await file.arrayBuffer()),
          cache,
        ),
      );
  }
  return { ...issue, renderAssets };
}
type OptimizedImage = {
  bytes: Buffer;
  mimeType: MediaAsset["mimeType"];
  width: number;
  height: number;
};
type OptimizationCache = Map<string, OptimizedImage>;
async function optimizedRenderAsset(
  asset: MediaAsset,
  original: Buffer,
  cache: OptimizationCache,
): Promise<RenderAsset> {
  const digest = createHash("sha256").update(original).digest("hex");
  let optimized = cache.get(digest);
  if (!optimized) {
    try {
      const metadata = await sharp(original, { failOn: "error" }).metadata();
      if (
        !["png", "jpeg", "webp"].includes(metadata.format ?? "") ||
        (metadata.pages ?? 1) > 1
      )
        throw new Error("Use a single-frame PNG, JPEG or WebP image.");
      const rotated = (metadata.orientation ?? 1) >= 5;
      const width = (rotated ? metadata.height : metadata.width)!;
      const height = (rotated ? metadata.width : metadata.height)!;
      if (width !== asset.width || height !== asset.height)
        throw new Error(
          "Decoded image dimensions do not match stored metadata.",
        );
      // Conservative 300 dpi A4 cover-crop resolution. Never upscale or rasterize magazine text.
      const scale = Math.min(
        1,
        Math.max(((210 / 25.4) * 300) / width, ((297 / 25.4) * 300) / height),
      );
      let pipeline = sharp(original, { failOn: "error" })
        .autoOrient()
        .resize({
          width: Math.ceil(width * scale),
          height: Math.ceil(height * scale),
          fit: "inside",
          withoutEnlargement: true,
        });
      const png = metadata.hasAlpha || metadata.format === "png";
      pipeline = png
        ? pipeline.png({ compressionLevel: 9 })
        : pipeline.jpeg({ quality: 92, chromaSubsampling: "4:4:4" });
      const result = await pipeline.toBuffer({ resolveWithObject: true });
      optimized =
        result.data.byteLength < original.byteLength
          ? {
              bytes: result.data,
              mimeType: png ? "image/png" : "image/jpeg",
              width: result.info.width,
              height: result.info.height,
            }
          : { bytes: original, mimeType: asset.mimeType, width, height };
      cache.set(digest, optimized);
    } catch (error) {
      throw new PdfInputError(
        `Cannot prepare image “${asset.name}”: ${error instanceof Error ? error.message : "Image decoding failed"}`,
        422,
      );
    }
  }
  return {
    asset: {
      ...asset,
      mimeType: optimized.mimeType,
      width: optimized.width,
      height: optimized.height,
      byteLength: optimized.bytes.byteLength,
    },
    dataUrl: `data:${optimized.mimeType};base64,${optimized.bytes.toString("base64")}`,
  };
}
/** Compatibility for old JSON callers; multipart optimizes directly from binary files. */
export async function optimizePdfImages(input: Issue): Promise<Issue> {
  const used = new Set(
    issueMediaReferences(input).map((reference) => reference.assetId),
  );
  const cache: OptimizationCache = new Map();
  const renderAssets: RenderAsset[] = [];
  for (const value of input.renderAssets ?? []) {
    if (used.has(value.asset.id))
      renderAssets.push(
        await optimizedRenderAsset(
          value.asset,
          Buffer.from(value.dataUrl.split(",")[1], "base64"),
          cache,
        ),
      );
  }
  return { ...input, renderAssets };
}
