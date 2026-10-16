import { describe, it, expect } from "vitest";
import { sampleIssue } from "../src/domain/sample";
import { migrateIssue } from "../src/domain/issue";
import { makeRow, gridSchema } from "../src/domain/grid";
import {
  moveLayoutBlock,
  resizeRow,
  reusableGrid,
  instantiateGrid,
} from "../src/studio/grid-layout";
import { issueMediaReferences } from "../src/media/render";
describe("Page Layout Builder placements", () => {
  it("round-trips independent content without changing official fields or legacy magazines", () => {
    const issue = structuredClone(sampleIssue),
      story = issue.sections[0].stories[0];
    const original = structuredClone(story),
      row = makeRow([6, 6]);
    row.cells[0].blocks = [
      { id: "linked-title", kind: "linked", source: "headline" },
      { id: "linked-article", kind: "linked", source: "article" },
    ];
    row.cells[1].blocks = [
      {
        id: "manual-title",
        kind: "manual",
        type: "heading",
        level: 1,
        text: "An independent heading",
      },
    ];
    story.grid = { rows: [row], continuation: [makeRow()] };
    const parsed = migrateIssue(issue).sections[0].stories[0];
    expect({ ...parsed, grid: undefined }).toEqual({
      ...original,
      grid: undefined,
    });
    expect(parsed.grid).toEqual(story.grid);
    expect(migrateIssue(sampleIssue)).toEqual(sampleIssue);
  });
  it("moves ordered placements between cells without mutating source, supports continuation and preserves manual content on shrink", () => {
    const row = makeRow([6, 6]),
      continuation = makeRow();
    row.cells[0].blocks = [
      { id: "a", kind: "manual", type: "paragraph", text: "Original manual" },
    ];
    row.cells[1].blocks = [{ id: "b", kind: "linked", source: "headline" }];
    const grid = { rows: [row], continuation: [continuation] };
    expect(moveLayoutBlock(grid, "a", row.cells[0].id, "a")).toBe(grid);
    const moved = moveLayoutBlock(grid, "a", row.cells[1].id, "b");
    expect(moved.rows[0].cells[1].blocks?.map((b) => b.id)).toEqual(["a", "b"]);
    expect(row.cells[0].blocks).toHaveLength(1);
    const shrunk = resizeRow(moved.rows[0], [12]);
    expect(shrunk.cells[0].blocks?.map((b) => b.id)).toEqual(["a", "b"]);
    const next = moveLayoutBlock(moved, "a", continuation.cells[0].id);
    expect(next.continuation[0].cells[0].blocks?.[0].id).toBe("a");
    expect(gridSchema.safeParse(next).success).toBe(true);
  });
  it("keeps linked flow active when moving or shrinking and rejects duplicate flow markers", () => {
    const row = makeRow([6, 6]);
    row.cells[0].flow = false;
    row.cells[1].flow = true;
    row.cells[1].blocks = [{ id: "flow", kind: "linked", source: "article" }];
    const shrunk = resizeRow(row, [12]);
    expect(shrunk.cells[0].flow).toBe(true);
    const grid = { rows: [row], continuation: [makeRow()] };
    const moved = moveLayoutBlock(grid, "flow", row.cells[0].id);
    expect(moved.rows[0].cells.map((c) => c.flow)).toEqual([true, false]);
    expect(gridSchema.safeParse(moved).success).toBe(true);
    row.cells[1].blocks.push({
      id: "flow2",
      kind: "linked",
      source: "article",
    });
    expect(gridSchema.safeParse(grid).success).toBe(false);
  });
  it("resolves manual images in both page variants through the existing image pipeline", () => {
    const issue = structuredClone(sampleIssue),
      story = issue.sections[0].stories[0],
      row = makeRow(),
      continuation = makeRow();
    const image = {
      assetId: "manual-image",
      alt: "Manual image",
      caption: "Kept caption",
      credit: "",
      focalPoint: { x: 0.5, y: 0.5 },
    };
    row.cells[0].blocks = [
      { id: "manual", kind: "manual", type: "figure", text: "", image },
    ];
    continuation.cells[0].blocks = [
      {
        id: "manual-cont",
        kind: "manual",
        type: "figure",
        text: "",
        image: { ...image, assetId: "continuation-image" },
      },
    ];
    story.grid = { rows: [row], continuation: [continuation] };
    expect(issueMediaReferences(issue).map((r) => r.assetId)).toEqual(
      expect.arrayContaining(["manual-image", "continuation-image"]),
    );
    const preset = reusableGrid(story.grid);
    expect(JSON.stringify(preset)).not.toContain("manual-image");
    expect(JSON.stringify(preset)).not.toContain("continuation-image");
  });
  it("presets retain source bindings with fresh placement IDs and exclude manual text", () => {
    const row = makeRow();
    row.cells[0].blocks = [
      { id: "source", kind: "linked", source: "headline" },
      {
        id: "private",
        kind: "manual",
        type: "paragraph",
        text: "Private text",
      },
    ];
    const preset = reusableGrid({ rows: [row], continuation: [makeRow()] });
    expect(JSON.stringify(preset)).not.toContain("Private text");
    const reused = instantiateGrid(preset);
    expect(reused.rows[0].cells[0].blocks?.[0]).toMatchObject({
      kind: "linked",
      source: "headline",
    });
    expect(reused.rows[0].cells[0].blocks?.[0].id).not.toBe("source");
  });
});
