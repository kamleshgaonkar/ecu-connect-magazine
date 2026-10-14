import { z } from "zod";

export const sectionNames = [
  "Cover Story",
  "What's Up @ ECU Worldwide",
  "Notice Board",
  "Special Feature",
  "New Office Announcement",
  "The ECU Worldwide Way",
  "Holidays Around the World",
] as const;
export const templates = ["feature", "dispatch", "bulletin"] as const;
const blockSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(["paragraph", "heading", "quote", "list"]),
  text: z.string().max(20000),
});
export const issueSchema = z
  .object({
    id: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(150),
    volume: z.number().int().min(1).max(999),
    date: z.string().max(50),
    updatedAt: z.string(),
    sample: z.boolean(),
    sections: z
      .array(
        z.object({
          id: z.string().min(1).max(100),
          name: z.string().trim().min(1).max(150),
          enabled: z.boolean(),
          template: z.enum(templates),
          stories: z
            .array(
              z.object({
                id: z.string().min(1).max(100),
                title: z.string().trim().min(1).max(200),
                subtitle: z.string().max(500),
                byline: z.string().max(150),
                blocks: z.array(blockSchema).max(100),
              }),
            )
            .max(50),
        }),
      )
      .max(30),
  })
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
export type Section = Issue["sections"][number];
export type Story = Section["stories"][number];
export type Block = Story["blocks"][number];
export const id = () => crypto.randomUUID();
export function newStory(): Story {
  return {
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
