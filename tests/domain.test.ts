import { describe, expect, it } from "vitest";
import { issueSchema, move, newIssue, wordCount } from "../src/domain/issue";
import { sampleIssue } from "../src/domain/sample";
import { escapeHtml, magazineDocument } from "../src/magazine/document";
describe("editorial domain", () => {
  it("validates the demonstration edition and all seven section types", () => {
    expect(issueSchema.parse(sampleIssue).sections).toHaveLength(7);
    expect(wordCount(sampleIssue)).toBeGreaterThan(500);
  });
  it("reorders without losing sections and respects boundaries", () => {
    expect(move(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(move(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });
  it("rejects invalid content and duplicate IDs before persistence/export", () => {
    expect(issueSchema.safeParse({ ...sampleIssue, title: "" }).success).toBe(
      false,
    );
    expect(
      issueSchema.safeParse({
        ...sampleIssue,
        sections: [sampleIssue.sections[0], sampleIssue.sections[0]],
      }).success,
    ).toBe(false);
  });
  it("creates independent blank editions", () => {
    const a = newIssue("New edition", 22),
      b = newIssue("Other edition", 23);
    expect(a.id).not.toBe(b.id);
    expect(a.sections).toEqual([]);
    expect(a.sample).toBe(false);
  });
  it("embeds hostile text as data rather than script markup", () => {
    const html = magazineDocument({
      ...sampleIssue,
      title: "</script><script>alert(1)</script>",
    });
    expect(html).not.toContain("</script><script>alert(1)");
    expect(html).toContain("\\u003c/script>");
    expect(escapeHtml("<img>")).toBe("&lt;img&gt;");
  });
});
