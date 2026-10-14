import { z } from "zod";
export const mediaAssetSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    width: z.number().int().positive().max(20000),
    height: z.number().int().positive().max(20000),
    byteLength: z.number().int().positive().max(8_000_000),
  })
  .strict();
export const mediaReferenceSchema = z
  .object({
    assetId: z.string().min(1).max(100),
    alt: z.string().max(500),
    caption: z.string().max(1000).default(""),
    credit: z.string().max(300).default(""),
    focalPoint: z
      .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
      .strict()
      .default({ x: 0.5, y: 0.5 }),
  })
  .strict();
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type MediaReference = z.infer<typeof mediaReferenceSchema>;
export type MediaAssetData = { asset: MediaAsset; bytes: Uint8Array };
