import { describe, it, expect } from "vitest";
import { newIssue, newSection, migrateIssue } from "../src/domain/issue";
import { safeLink, richBlockSchema } from "../src/domain/content";
describe("continuous content compatibility", () => {
  it("keeps legacy stories unchanged until edited and persists marks without changing metadata", () => {
    const issue = newIssue("Rich article", 24);
    issue.sections = [newSection("Cover Story")];
    const legacy = structuredClone(issue);
    expect(migrateIssue(issue)).toEqual(legacy);
    const story = issue.sections[0].stories[0];
    story.contentMode = "continuous";
    story.blocks = [
      {
        id: "rich",
        type: "paragraph",
        text: "Hello team",
        rich: richBlockSchema.parse({
          runs: [
            { text: "Hello ", bold: true },
            { text: "team", underline: true, href: "mailto:team@example.test" },
          ],
          align: "justify",
        }),
      },
    ];
    expect(migrateIssue(issue)).toEqual(issue);
    expect(story.title).toBe(legacy.sections[0].stories[0].title);
  });
  it("only permits safe links and structured formatting", () => {
    expect(safeLink("mailto:team@example.test")).toBe(
      "mailto:team@example.test",
    );
    expect(safeLink("team@example.test")).toBe("mailto:team@example.test");
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,test",
      "//evil.test",
      "file:///tmp/a",
    ])
      expect(safeLink(url)).toBeUndefined();
    expect(
      richBlockSchema.safeParse({
        runs: [{ text: "body", style: "position:absolute" }],
      }).success,
    ).toBe(false);
  });
});

it("editorial components retain stable identities and reject unsafe styles", async () => {
  const { newComponent, componentSchema } =
    await import("../src/domain/content");
  const table = newComponent("table");
  expect(componentSchema.parse(table)).toEqual(table);
  for (const kind of ["profile", "testimonial", "cta", "info"] as const)
    expect(componentSchema.parse(newComponent(kind))).toEqual(
      newComponent(kind),
    );
  const cta = newComponent("cta");
  expect(
    componentSchema.safeParse({ ...cta, href: "javascript:alert(1)" }).success,
  ).toBe(false);
  expect(
    componentSchema.safeParse({
      ...cta,
      background: "url(https://example.test)",
    }).success,
  ).toBe(false);
  if (table.kind === "table")
    expect(
      new Set(
        table.rows.flatMap((row) => [
          row.id,
          ...row.cells.map((cell) => cell.id),
        ]),
      ).size,
    ).toBe(9);
});

it("body undo restores surviving grid bindings without overwriting later manual layouts or backgrounds", async () => {
  const { newStory, id } = await import("../src/domain/issue");
  const { initialGrid } = await import("../src/studio/grid-layout");
  const { bodySnapshot, restoreBody } = await import("../src/content/history");
  const story = newStory();
  story.grid = initialGrid(story);
  story.grid.rows[0].cells[0].contentIds = [story.blocks[0].id];
  const snapshot = bodySnapshot(story);
  const next = structuredClone(story);
  next.blocks = [{ id: id(), type: "paragraph", text: "Replacement" }];
  next.grid!.rows[0].cells[0].contentIds = [];
  next.grid!.rows[0].heightMode = "fixed";
  next.grid!.rows[0].heightMm = 120;
  const restored = restoreBody(next, snapshot);
  expect(restored.blocks).toEqual(story.blocks);
  expect(restored.grid!.rows[0].heightMm).toBe(120);
  expect(restored.grid!.rows[0].heightMode).toBe("fixed");
  expect(restored.grid!.rows[0].cells[0].contentIds).toEqual([
    story.blocks[0].id,
  ]);
});
