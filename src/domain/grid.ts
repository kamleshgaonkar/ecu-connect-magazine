import { z } from "zod";
import { mediaReferenceSchema } from "./media";
export const layoutBlockSchema = z.discriminatedUnion("kind", [
  z
    .object({
      id: z.string().min(1).max(100),
      kind: z.literal("linked"),
      source: z.enum(["headline", "introduction", "author", "article"]),
    })
    .strict(),
  z
    .object({
      id: z.string().min(1).max(100),
      kind: z.literal("manual"),
      type: z.enum([
        "heading",
        "paragraph",
        "list",
        "figure",
        "quote",
        "divider",
        "spacer",
      ]),
      text: z.string().max(20000),
      level: z.number().int().min(1).max(6).optional(),
      ordered: z.boolean().optional(),
      image: mediaReferenceSchema.optional(),
      heightMm: z.number().min(1).max(180).optional(),
    })
    .strict(),
]);
export type LayoutBlock = z.infer<typeof layoutBlockSchema>;
export const gridCellSchema = z
  .object({
    id: z.string().min(1).max(100),
    width: z.number().min(1).max(12),
    flow: z.boolean(),
    contentType: z
      .enum([
        "paragraph",
        "heading",
        "figure",
        "quote",
        "list",
        "callout",
        "caption",
      ])
      .optional(),
    imageHeightMm: z.number().min(20).max(180).optional(),
    imageFit: z.enum(["cover", "contain"]).optional(),
    blocks: z.array(layoutBlockSchema).max(100).optional(),
    contentIds: z.array(z.string().min(1).max(100)).max(100),
  })
  .strict();
export const gridRowSchema = z
  .object({
    id: z.string().min(1).max(100),
    cells: z.array(gridCellSchema).min(1).max(4),
    heightMode: z.enum(["auto", "min", "fixed"]),
    heightMm: z.number().min(10).max(240),
    paddingMm: z.number().min(0).max(15),
    gapMm: z.number().min(0).max(15),
    align: z.enum(["start", "center", "end"]),
    keepTogether: z.boolean(),
    breakBefore: z.boolean(),
  })
  .strict();
export const gridSchema = z
  .object({
    rows: z.array(gridRowSchema).min(1).max(60),
    continuation: z.array(gridRowSchema).min(1).max(12),
  })
  .strict()
  .superRefine((grid, ctx) => {
    const ids = [...grid.rows, ...grid.continuation].flatMap((r) => [
      r.id,
      ...r.cells.flatMap((c) => [c.id, ...(c.blocks ?? []).map((b) => b.id)]),
    ]);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Grid IDs must be unique." });
    for (const row of [...grid.rows, ...grid.continuation])
      for (const cell of row.cells) {
        const links = (cell.blocks ?? []).filter(
          (b) => b.kind === "linked" && b.source === "article",
        );
        if (links.length > 1 || (links.length && !cell.flow))
          ctx.addIssue({
            code: "custom",
            message: "A cell can contain one active Article Content link.",
          });
      }
    const assigned = grid.rows.flatMap((r) =>
      r.cells.flatMap((c) => c.contentIds),
    );
    if (new Set(assigned).size !== assigned.length)
      ctx.addIssue({
        code: "custom",
        message: "Content must not be assigned twice.",
      });
    if (!grid.continuation.some((r) => r.cells.some((c) => c.flow)))
      ctx.addIssue({
        code: "custom",
        message: "Continuation needs a linked text cell.",
      });
    if (grid.continuation.some((r) => r.cells.some((c) => c.contentIds.length)))
      ctx.addIssue({
        code: "custom",
        message: "Continuation cells must not repeat story content.",
      });
  });
export type GridLayout = z.infer<typeof gridSchema>;
export type GridRow = z.infer<typeof gridRowSchema>;
export function makeRow(widths = [12]): GridRow {
  return {
    id: crypto.randomUUID(),
    cells: widths.map((width, index) => ({
      id: crypto.randomUUID(),
      width,
      flow: index === 0,
      contentIds: [],
    })),
    heightMode: "auto",
    heightMm: 70,
    paddingMm: 0,
    gapMm: 5,
    align: "start",
    keepTogether: false,
    breakBefore: false,
  };
}
