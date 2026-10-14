import { z } from "zod";
import { templateIds, pageMasterIds, themeIds } from "./design";
import { mediaReferenceSchema, renderAssetSchema } from "./media";

export const sectionNames = [
  "Cover Story",
  "What's Up @ ECU Worldwide",
  "Notice Board",
  "Special Feature",
  "New Office Announcement",
  "The ECU Worldwide Way",
  "Holidays Around the World",
] as const;
export const templates = templateIds;
const blockSchema = z
  .object({
    id: z.string().min(1).max(100),
    type: z.enum(["paragraph", "heading", "quote", "list"]),
    text: z.string().max(20000),
  })
  .strict();
export const issueSchema = z
  .object({
    schemaVersion: z.literal(2).default(2),
    theme: z.enum(themeIds).default("ecu-light"),
    cover: z
      .object({
        headline: z.string().max(200).default(""),
        supportingText: z.string().max(500).default(""),
        edition: z.string().max(50).default("FORTNIGHTLY EDITION"),
        image: mediaReferenceSchema.optional(),
        logo: mediaReferenceSchema.optional(),
        surface: z.enum(["white", "sky", "blue"]).default("white"),
      })
      .strict()
      .optional(),
    renderAssets: z.array(renderAssetSchema).max(100).optional(),
    furniture: z
      .object({
        header: z.boolean().default(true),
        footer: z.boolean().default(true),
        folios: z.boolean().default(true),
        topAccent: z.boolean().default(true),
      })
      .strict()
      .prefault({}),
    id: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(150),
    volume: z.number().int().min(1).max(999),
    date: z.string().max(50),
    updatedAt: z.string(),
    sample: z.boolean(),
    sections: z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            name: z.string().trim().min(1).max(150),
            enabled: z.boolean(),
            template: z.enum(templates),
            theme: z.enum(["inherit", ...themeIds]).default("inherit"),
            stories: z
              .array(
                z
                  .object({
                    enabled: z.boolean().default(true),
                    template: z
                      .enum(["inherit", ...templateIds])
                      .default("inherit"),
                    pageTemplate: z
                      .enum(["inherit", ...pageMasterIds])
                      .default("inherit"),
                    continuationTemplate: z
                      .enum(["inherit", ...pageMasterIds])
                      .default("inherit"),
                    theme: z.enum(["inherit", ...themeIds]).default("inherit"),
                    media: z.array(mediaReferenceSchema).max(30).default([]),
                    visual: z
                      .object({
                        summary: z.string().max(1000).default(""),
                        thumbnailShape: z
                          .enum(["landscape", "portrait", "square"])
                          .optional(),
                        hero: mediaReferenceSchema.optional(),
                        thumbnail: mediaReferenceSchema.optional(),
                        position: z
                          .enum(["below", "left", "right"])
                          .default("below"),
                        heroLayout: z.enum(["large", "full"]).default("large"),
                      })
                      .strict()
                      .optional(),
                    id: z.string().min(1).max(100),
                    title: z.string().trim().min(1).max(200),
                    subtitle: z.string().max(500),
                    byline: z.string().max(150),
                    blocks: z.array(blockSchema).max(100),
                  })
                  .strict(),
              )
              .max(50),
          })
          .strict(),
      )
      .max(30),
  })
  .strict()
  .superRefine((issue, ctx) => {
    const ids = [
      issue.id,
      ...issue.sections.flatMap((s) => [
        s.id,
        ...s.stories.flatMap((t) => [t.id, ...t.blocks.map((b) => b.id)]),
      ]),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "IDs must be unique within an issue.",
      });
  });
export type Issue = z.infer<typeof issueSchema>;
export type IssueInput = z.input<typeof issueSchema>;
/** Read legacy records without rewriting storage. All records are validated before any save.
 * Future versions and unknown fields are rejected rather than silently stripped.
 */
export function migrateIssue(input: unknown): Issue {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return issueSchema.parse(input);
  const record = input as Record<string, unknown>;
  const version = record.schemaVersion === undefined ? 1 : record.schemaVersion;
  if (version !== 1 && version !== 2)
    throw new Error(
      `Unsupported issue schema version: ${String(version)}. Stored content has not been overwritten.`,
    );
  return issueSchema.parse({ ...record, schemaVersion: 2 });
}
export type Section = Issue["sections"][number];
export type Story = Section["stories"][number];
export type Block = Story["blocks"][number];
export const id = () => crypto.randomUUID();
export function newStory(): Story {
  return {
    enabled: true,
    template: "inherit",
    pageTemplate: "inherit",
    continuationTemplate: "inherit",
    theme: "inherit",
    media: [],
    id: id(),
    title: "Untitled story",
    subtitle: "",
    byline: "",
    blocks: [{ id: id(), type: "paragraph", text: "" }],
  };
}
export function newIssue(title: string, volume: number): Issue {
  return {
    id: id(),
    schemaVersion: 2,
    theme: "ecu-light",
    furniture: { header: true, footer: true, folios: true, topAccent: true },
    title,
    volume,
    date: "",
    updatedAt: new Date().toISOString(),
    sample: false,
    sections: [],
  };
}
export function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const result = [...items];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
export function wordCount(issue: Issue) {
  return issue.sections
    .flatMap((s) => s.stories)
    .flatMap((s) => s.blocks)
    .reduce((n, b) => n + (b.text.trim().match(/\S+/g)?.length ?? 0), 0);
}
