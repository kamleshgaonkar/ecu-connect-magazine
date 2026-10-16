import { describe, it, expect } from "vitest";
import { newSection, sectionNames, migrateIssue } from "../src/domain/issue";
import { sampleIssue } from "../src/domain/sample";
import { buildRenderModel } from "../src/magazine/templates";
import { LocalIssueRepository } from "../src/repositories/issues";
describe("new-section blank page pairs", () => {
  it.each(sectionNames)(
    "creates one completely empty first story for %s",
    (name) => {
      const section = newSection(name);
      expect(section.stories).toHaveLength(1);
      expect(section.stories[0]).toMatchObject({
        title: "",
        subtitle: "",
        byline: "",
        blocks: [],
        media: [],
        pagePair: name === "What's Up @ ECU Worldwide" ? "split" : "white",
      });
      expect(section.stories[0].grid).toBeUndefined();
      expect(section.stories[0].visual).toBeUndefined();
      const issue = structuredClone(sampleIssue);
      issue.sections.push(section);
      expect(migrateIssue(JSON.parse(JSON.stringify(issue)))).toEqual(issue);
    },
  );
  it("keeps section numbers derived from current included order and preserves the selected page style after renaming", () => {
    const issue = structuredClone(sampleIssue);
    const cover = newSection("Cover Story"),
      whatsUp = newSection("What's Up @ ECU Worldwide");
    issue.sections = [whatsUp, cover];
    whatsUp.name = "Renamed section";
    expect(
      buildRenderModel(issue).stories.map((s) => [
        s.sectionNumber,
        s.sectionName,
        s.story.pagePair,
      ]),
    ).toEqual([
      [1, "Renamed section", "split"],
      [2, "Cover Story", "white"],
    ]);
    whatsUp.enabled = false;
    expect(buildRenderModel(issue).stories.map((s) => s.sectionNumber)).toEqual(
      [1],
    );
  });
  it("keeps legacy issues unchanged and still rejects an empty legacy story title", () => {
    expect(migrateIssue(sampleIssue)).toEqual(sampleIssue);
    expect(
      sampleIssue.sections.flatMap((s) => s.stories).every((s) => !s.pagePair),
    ).toBe(true);
    const issue = structuredClone(sampleIssue);
    issue.sections[0].stories[0].title = "";
    expect(() => migrateIssue(issue)).toThrow();
  });
  it("persists empty titles and the explicit page pair without overwriting legacy stories", async () => {
    const store = new Map<string, string>();
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
    try {
      const repo = new LocalIssueRepository();
      const issue = structuredClone(sampleIssue);
      issue.sections.push(newSection("Notice Board"));
      await repo.save(issue);
      expect(await repo.get(issue.id)).toEqual(issue);
      expect((await repo.get(issue.id))!.sections.slice(0, -1)).toEqual(
        sampleIssue.sections,
      );
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: original,
      });
    }
  });
});

describe("opening field persistence", () => {
  it("preserves independent overrides, including intentionally blank values", () => {
    const issue = structuredClone(sampleIssue);
    const section = newSection("Cover Story");
    const story = section.stories[0];
    Object.assign(story, {
      title: "Index headline",
      subtitle: "Original",
      byline: "Author",
    });
    story.openingFields = { title: "Display headline", subtitle: "" };
    issue.sections.push(section);
    const saved = migrateIssue(JSON.parse(JSON.stringify(issue)));
    expect(saved.sections.at(-1)!.stories[0]).toEqual(story);
    expect(saved.sections.at(-1)!.stories[0].title).toBe("Index headline");
  });
});
