import { describe, it, expect } from "vitest";
import { migrateIssue, newIssue, newSection } from "../src/domain/issue";
import { headlineLayoutSchema, storyBadgeSchema } from "../src/domain/headline";
import { LocalIssueRepository } from "../src/repositories/issues";
describe("optional opening metadata", () => {
  it("preserves old appearance without adding layout/badge records", () => {
    const issue = newIssue("Legacy", 21);
    issue.sections = [newSection("Cover Story")];
    const result = migrateIssue(issue).sections[0].stories[0];
    expect(result.headlineLayout).toBeUndefined();
    expect(result.badge).toBeUndefined();
  });
  it("retains canonical indexing metadata while storing presentation independently", async () => {
    const issue = newIssue("Presentation", 21);
    issue.sections = [newSection("Cover Story")];
    const story = issue.sections[0].stories[0];
    story.title = "Canonical index headline";
    story.headlineLayout = headlineLayoutSchema.parse({
      manualText: "Manual\nheadline",
      lines: 2,
      width: 70,
      verticalMm: 145,
    });
    story.badge = storyBadgeSchema.parse({ enabled: true, text: "People" });
    const data = new Map<string, string>();
    const previous = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
      },
    });
    try {
      const repository = new LocalIssueRepository();
      await repository.save(issue);
      expect((await repository.get(issue.id))?.sections[0].stories[0]).toEqual(
        story,
      );
      expect(story.title).toBe("Canonical index headline");
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previous,
      });
    }
  });
  it("rejects unsafe typography and invalid settings", () => {
    for (const value of [
      { fontSize: 8 },
      { fontSize: 200 },
      { width: 0 },
      { lines: 5 },
      { lineHeight: 0.5 },
      { verticalMm: 999 },
    ])
      expect(headlineLayoutSchema.safeParse(value).success).toBe(false);
    expect(
      storyBadgeSchema.safeParse({ background: "url(evil)" }).success,
    ).toBe(false);
  });
});
