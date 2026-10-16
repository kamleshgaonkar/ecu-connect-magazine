import { z } from "zod";
/** Optional: legacy headlines and disabled badges retain their exact template appearance. */
export const headlineLayoutSchema = z
  .object({
    placement: z.enum(["above", "below", "custom"]).default("custom"),
    verticalMm: z.number().min(0).max(250).optional(),
    align: z.enum(["left", "centre", "right"]).default("left"),
    width: z.number().min(20).max(100).default(100),
    lines: z
      .union([
        z.literal("auto"),
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
      ])
      .default("auto"),
    fontSize: z.number().min(16).max(60).optional(),
    lineHeight: z.number().min(1).max(1.8).default(1.12),
    manualText: z.string().max(204).optional(),
  })
  .strict();
export const storyBadgeSchema = z
  .object({
    enabled: z.boolean().default(false),
    text: z.string().max(80).default(""),
    background: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#000000"),
    colour: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#FFFFFF"),
    fontSize: z.number().min(7).max(18).default(9),
    radius: z.number().min(0).max(12).default(5),
  })
  .strict();
export type HeadlineLayout = z.infer<typeof headlineLayoutSchema>;
export type StoryBadge = z.infer<typeof storyBadgeSchema>;
