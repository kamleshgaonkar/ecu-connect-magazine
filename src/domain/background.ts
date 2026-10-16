import { z } from "zod";
import { mediaReferenceSchema } from "./media";
const colour = z.string().regex(/^#[0-9a-fA-F]{6}$/);
/** Optional on existing stories; absence and mode=default preserve the page master. */
export const backgroundSchema = z
  .object({
    contrast: z.enum(["auto", "light", "dark", "original"]).optional(),
    textTreatment: z.enum(["none", "shadow", "backing"]).optional(),
    mode: z.enum(["default", "solid", "gradient", "image"]).default("default"),
    colour: colour.default("#FFFFFF"),
    gradientColour: colour.default("#034EA2"),
    direction: z.number().min(0).max(360).default(180),
    image: mediaReferenceSchema.optional(),
    placement: z.enum(["top", "centre", "bottom"]).default("top"),
    coverage: z.number().min(1).max(100).default(100),
    opacity: z.number().min(0).max(100).default(100),
    fadeDirection: z.enum(["down", "up"]).default("down"),
    fadeStart: z.number().min(0).max(100).default(40),
    fadeStrength: z.number().min(0).max(100).default(100),
    fadeColour: colour.default("#FFFFFF"),
  })
  .strict();
export const pageBackgroundsSchema = z.record(
  z
    .string()
    .regex(/^(0|[1-9]\d{0,2})$/)
    .refine((key) => Number(key) < 300),
  backgroundSchema,
);
export type BackgroundDesign = z.infer<typeof backgroundSchema>;
export const defaultBackground = (): BackgroundDesign =>
  backgroundSchema.parse({});
