import { describe, it, expect } from "vitest";
import { sampleIssue } from "../src/domain/sample";
import { newStory, migrateIssue } from "../src/domain/issue";
import { toggleMagazineVisibility } from "../src/studio/visibility";
import { reorderMagazine } from "../src/studio/reorder";
import { buildRenderModel } from "../src/magazine/templates";
import { storyDropSlots } from "../src/components/use-stories-drag";
describe("Stories visibility and insertion", () => {
  it("masks a section without rewriting or losing individual story visibility", () => {
    const issue = structuredClone(sampleIssue),
      section = issue.sections[0],
      hidden = { ...newStory(), enabled: false };
    section.stories.push(hidden);
    const copy = structuredClone(issue);
    const off = toggleMagazineVisibility(issue, section.id);
    expect(off.sections[0].enabled).toBe(false);
    expect(off.sections[0].stories).toBe(section.stories);
    expect(
      buildRenderModel(off).stories.some((s) => s.sectionId === section.id),
    ).toBe(false);
    const restored = toggleMagazineVisibility(off, section.id);
    expect(restored).toEqual(issue);
    expect(restored.sections[0].stories[1].enabled).toBe(false);
    expect(issue).toEqual(copy);
  });
  it("hides only the chosen story and round-trips all content through the existing schema", () => {
    const issue = structuredClone(sampleIssue),
      section = issue.sections[0],
      story = section.stories[0],
      next = toggleMagazineVisibility(issue, section.id, story.id);
    expect(next.sections[0].enabled).toBe(true);
    expect(next.sections[0].stories[0]).toEqual({ ...story, enabled: false });
    expect(
      buildRenderModel(next).stories.some((s) => s.story.id === story.id),
    ).toBe(false);
    expect(migrateIssue(JSON.parse(JSON.stringify(next)))).toEqual(next);
    expect(toggleMagazineVisibility(issue, "missing")).toBe(issue);
  });
  it("uses explicit before/after section boundaries in both directions", () => {
    const issue = sampleIssue,
      [a, b, c] = issue.sections;
    expect(
      reorderMagazine(
        issue,
        { kind: "section", id: a.id },
        b.id,
        undefined,
        "before",
      ),
    ).toBe(issue);
    const after = reorderMagazine(
      issue,
      { kind: "section", id: a.id },
      c.id,
      undefined,
      "after",
    );
    expect(after.sections.slice(0, 3).map((s) => s.id)).toEqual([
      b.id,
      c.id,
      a.id,
    ]);
    const before = reorderMagazine(
      after,
      { kind: "section", id: a.id },
      b.id,
      undefined,
      "before",
    );
    expect(before.sections).toEqual(issue.sections);
  });
  it("moves story records with their original flags and avoids dirty no-op drops", () => {
    const issue = structuredClone(sampleIssue),
      [a, b] = issue.sections,
      story = a.stories[0];
    story.enabled = false;
    expect(
      reorderMagazine(
        issue,
        { kind: "story", id: story.id, sectionId: a.id },
        a.id,
      ),
    ).toBe(issue);
    const moved = reorderMagazine(
      issue,
      { kind: "story", id: story.id, sectionId: a.id },
      b.id,
      b.stories[0].id,
    );
    expect(moved.sections[1].stories[0]).toBe(story);
    expect(moved.sections[1].stories[0].enabled).toBe(false);
    expect(issue.sections[0].stories[0]).toBe(story);
  });
  it("offers typed section/story keyboard insertion slots, respecting target capacity", () => {
    const issue = structuredClone(sampleIssue),
      [a, b] = issue.sections,
      story = a.stories[0];
    const source = { kind: "story" as const, id: story.id, sectionId: a.id };
    const slots = storyDropSlots(issue, source);
    expect(slots).toContainEqual({
      sectionId: b.id,
      beforeStoryId: b.stories[0].id,
    });
    expect(slots.some((s) => s.beforeStoryId === story.id)).toBe(false);
    b.stories = Array.from({ length: 50 }, () => newStory());
    expect(
      storyDropSlots(issue, source).some((s) => s.sectionId === b.id),
    ).toBe(false);
  });
});
