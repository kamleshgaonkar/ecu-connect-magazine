import { describe, it, expect } from "vitest";
import { sampleIssue } from "../src/domain/sample";
import { migrateIssue } from "../src/domain/issue";
import { gridSchema, makeRow } from "../src/domain/grid";
import {
  initialGrid,
  resizeRow,
  detachRow,
  moveContent,
  reusableGrid,
  applyPreset,
} from "../src/studio/grid-layout";
describe("non-destructive visual grids", () => {
  it("loads old magazines without adding layout data or changing content", () => {
    const old = structuredClone(sampleIssue);
    expect(migrateIssue(old)).toEqual(old);
    expect(migrateIssue(old).sections[0].stories[0].grid).toBeUndefined();
  });
  it("preserves all content assignments when shrinking columns and removing rows", () => {
    const story = structuredClone(sampleIssue.sections[0].stories[0]);
    const row = makeRow([6, 6]);
    row.cells[1].contentIds = [story.blocks[0].id];
    const next = resizeRow(row, [12]);
    expect(next.cells[0].contentIds).toEqual([story.blocks[0].id]);
    const grid = { rows: [row], continuation: [makeRow()] };
    expect(detachRow(grid, row.id).rows).toHaveLength(1);
    expect(story.blocks).toEqual(sampleIssue.sections[0].stories[0].blocks);
  });
  it("moves references without duplicating or deleting article blocks", () => {
    const story = sampleIssue.sections[0].stories[0],
      grid = initialGrid(story),
      row = makeRow([6, 6]);
    grid.rows.push(row);
    const moved = moveContent(grid, story.blocks[0].id, row.cells[1].id);
    expect(
      moved.rows
        .flatMap((r) => r.cells.flatMap((c) => c.contentIds))
        .filter((id) => id === story.blocks[0].id),
    ).toHaveLength(1);
    expect(grid.rows[1].cells[1].contentIds).toEqual([]);
  });
  it("presets contain no story text, asset IDs or block IDs and produce fresh layout IDs", () => {
    const story = sampleIssue.sections[0].stories[0],
      grid = initialGrid(story);
    grid.rows[0].cells[0].contentIds = [story.blocks[0].id];
    const preset = reusableGrid(grid);
    expect(JSON.stringify(preset)).not.toContain(story.blocks[0].id);
    const reused = applyPreset(preset, story);
    expect(reused.rows[0].id).not.toBe(grid.rows[0].id);
    expect(gridSchema.safeParse(reused).success).toBe(true);
  });
  it("rejects repeated placements, dangling IDs and continuation without flow", () => {
    const issue = structuredClone(sampleIssue),
      story = issue.sections[0].stories[0],
      grid = initialGrid(story);
    grid.rows[0].cells[0].contentIds = ["missing"];
    story.grid = grid;
    expect(() => migrateIssue(issue)).toThrow();
    grid.rows[0].cells[0].contentIds = [];
    grid.continuation[0].cells[0].flow = false;
    expect(() => gridSchema.parse(grid)).toThrow();
  });
});

it("keeps image layout rules when column proportions change", () => {
  const row = makeRow([7, 5]);
  row.cells[1].contentType = "figure";
  row.cells[1].imageHeightMm = 90;
  row.cells[1].imageFit = "contain";
  const resized = resizeRow(row, [6, 6]);
  expect(resized.cells[1]).toMatchObject({
    contentType: "figure",
    imageHeightMm: 90,
    imageFit: "contain",
  });
});
