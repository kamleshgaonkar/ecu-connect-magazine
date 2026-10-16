import { z } from "zod";
export const alignmentSchema = z.enum(["left", "center", "right", "justify"]);
export const safeLinkSchema = z
  .string()
  .max(2000)
  .refine(
    (value) => /^(https?:\/\/|mailto:|tel:)/i.test(value),
    "Use an http, https, mailto or tel link.",
  );
export const runSchema = z
  .object({
    text: z.string().max(200000),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    href: safeLinkSchema.optional(),
  })
  .strict();
export const richTextSchema = z
  .object({
    runs: z.array(runSchema).max(10000),
    align: alignmentSchema.default("left"),
  })
  .strict();
export const richBlockSchema = richTextSchema
  .extend({
    level: z.number().int().min(1).max(6).optional(),
    ordered: z.boolean().optional(),
    start: z.number().int().min(1).max(100000).optional(),
    items: z.array(richTextSchema).max(1000).optional(),
  })
  .strict();
export type RichText = z.infer<typeof richTextSchema>;
export type TextRun = z.infer<typeof runSchema>;
export type RichBlock = z.infer<typeof richBlockSchema>;
export function safeLink(value: string) {
  const trimmed = value.trim();
  const normal = /^[^\s@:]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    ? `mailto:${trimmed}`
    : trimmed;
  return safeLinkSchema.safeParse(normal).success ? normal : undefined;
}
const colourSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const tableCellSchema = z
  .object({
    id: z.string().min(1).max(100),
    content: richTextSchema,
    background: colourSchema.optional(),
    colour: colourSchema.optional(),
  })
  .strict();
export const tableRowSchema = z
  .object({
    id: z.string().min(1).max(100),
    cells: z.array(tableCellSchema).min(1).max(12),
  })
  .strict();
export const componentSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("table"),
      header: z.boolean(),
      rows: z.array(tableRowSchema).min(1).max(500),
      borderColour: colourSchema,
      borderWidth: z.number().min(0).max(3),
      background: colourSchema,
      headerBackground: colourSchema,
    })
    .strict()
    .refine(
      (table) =>
        table.rows.every(
          (row) => row.cells.length === table.rows[0].cells.length,
        ),
      "Table rows must have the same number of columns.",
    ),
  z
    .object({
      kind: z.literal("profile"),
      name: z.string().max(150),
      designation: z.string().max(200),
      company: z.string().max(200),
      plateColour: colourSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("testimonial"),
      preset: z.enum(["executive", "compact"]),
      quote: z.string().max(20000),
      name: z.string().max(150),
      designation: z.string().max(200),
      company: z.string().max(200),
    })
    .strict(),
  z
    .object({
      kind: z.literal("cta"),
      heading: z.string().max(300),
      content: richTextSchema,
      href: safeLinkSchema.optional(),
      linkLabel: z.string().max(150),
      background: colourSchema,
      colour: colourSchema,
      radius: z.number().min(0).max(12),
    })
    .strict(),
  z
    .object({
      kind: z.literal("info"),
      heading: z.string().max(300),
      content: richTextSchema,
      background: colourSchema,
      borderColour: colourSchema,
      borderWidth: z.number().min(0).max(3),
      paddingMm: z.number().min(1).max(15),
      radius: z.number().min(0).max(12),
    })
    .strict(),
]);
export type EditorialComponent = z.infer<typeof componentSchema>;
export type TableComponent = Extract<EditorialComponent, { kind: "table" }>;
export function blankRich(): RichText {
  return { runs: [], align: "left" };
}
export function newTableCell() {
  return { id: crypto.randomUUID(), content: blankRich() };
}
export function newComponent(
  kind: EditorialComponent["kind"],
): EditorialComponent {
  switch (kind) {
    case "table":
      return {
        kind,
        header: true,
        rows: Array.from({ length: 3 }, () => ({
          id: crypto.randomUUID(),
          cells: Array.from({ length: 2 }, newTableCell),
        })),
        borderColour: "#034EA2",
        borderWidth: 0.5,
        background: "#FFFFFF",
        headerBackground: "#034EA2",
      };
    case "profile":
      return {
        kind,
        name: "",
        designation: "",
        company: "",
        plateColour: "#FFDD00",
      };
    case "testimonial":
      return {
        kind,
        preset: "compact",
        quote: "",
        name: "",
        designation: "",
        company: "",
      };
    case "cta":
      return {
        kind,
        heading: "",
        content: blankRich(),
        linkLabel: "",
        background: "#FFDD00",
        colour: "#034EA2",
        radius: 3,
      };
    case "info":
      return {
        kind,
        heading: "",
        content: blankRich(),
        background: "#F0F7FA",
        borderColour: "#034EA2",
        borderWidth: 0.5,
        paddingMm: 4,
        radius: 3,
      };
  }
}
export function componentText(component: EditorialComponent) {
  if (component.kind === "table")
    return component.rows
      .map((row) =>
        row.cells
          .map((cell) => cell.content.runs.map((run) => run.text).join(""))
          .join("\t"),
      )
      .join("\n");
  if (component.kind === "profile")
    return [component.name, component.designation, component.company]
      .filter(Boolean)
      .join("\n");
  if (component.kind === "testimonial")
    return [
      component.quote,
      component.name,
      component.designation,
      component.company,
    ]
      .filter(Boolean)
      .join("\n");
  return [
    component.heading,
    component.content.runs.map((run) => run.text).join(""),
    component.kind === "cta" ? component.linkLabel : "",
  ]
    .filter(Boolean)
    .join("\n");
}
