import { describe, expect, it } from "vitest";
import { sampleIssue } from "../src/domain/sample";
import { reorderMagazine } from "../src/studio/reorder";
describe("workspace ordering", () => {
  it("reorders sections without changing their records or mutating the source", () => {
    const source = structuredClone(sampleIssue),
      original = structuredClone(source);
    const moved = reorderMagazine(
      source,
      { kind: "section", id: source.sections[0].id },
      source.sections[1].id,
    );
    expect(moved.sections[1]).toEqual(original.sections[0]);
    expect(source).toEqual(original);
    expect(moved.sections.flatMap((s) => s.stories)).toHaveLength(
      original.sections.flatMap((s) => s.stories).length,
    );
  });
  it("moves a complete story between sections and supports ordering inside a section", () => {
    const source = structuredClone(sampleIssue),
      a = source.sections[0],
      b = source.sections[1],
      story = a.stories[0];
    const moved = reorderMagazine(
      source,
      { kind: "story", id: story.id, sectionId: a.id },
      b.id,
      b.stories[0].id,
    );
    expect(moved.sections[0].stories).toHaveLength(a.stories.length - 1);
    expect(moved.sections[1].stories[0]).toEqual(story);
    const again = reorderMagazine(
      moved,
      { kind: "story", id: story.id, sectionId: b.id },
      b.id,
    );
    expect(again.sections[1].stories.at(-1)).toEqual(story);
    expect(source.sections[0].stories[0]).toEqual(story);
  });
  it("ignores invalid or self drops and respects section capacity", () => {
    const a = sampleIssue.sections[0],
      b = sampleIssue.sections[1],
      story = a.stories[0];
    expect(
      reorderMagazine(sampleIssue, { kind: "section", id: "missing" }, b.id),
    ).toBe(sampleIssue);
    expect(
      reorderMagazine(
        sampleIssue,
        { kind: "story", id: story.id, sectionId: a.id },
        a.id,
        story.id,
      ),
    ).toBe(sampleIssue);
    const full = structuredClone(sampleIssue);
    full.sections[1].stories = Array.from({ length: 50 }, (_, i) => ({
      ...story,
      id: "full-" + i,
    }));
    expect(
      reorderMagazine(
        full,
        { kind: "story", id: story.id, sectionId: a.id },
        b.id,
      ),
    ).toBe(full);
  });
});
