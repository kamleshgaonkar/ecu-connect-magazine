import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { sampleIssue } from "../src/domain/sample";
import { applyStudioLayout } from "../src/studio/apply-layout";
import {
  studioLayouts,
  friendlyPreviewMessage,
} from "../src/studio/layout-catalog";
it("only exposes four implemented layout actions and maps every thumbnail to its exact original page", () => {
  const manifest = JSON.parse(
    readFileSync("public/template-thumbnails/sources.json", "utf8"),
  );
  expect(studioLayouts).toHaveLength(17);
  expect(
    studioLayouts.filter((layout) => layout.action).map((layout) => layout.id),
  ).toEqual(["t01", "t02", "t03", "t04"]);
  for (const layout of studioLayouts) {
    expect(
      manifest.find((entry: { id: string }) => entry.id === layout.id),
    ).toMatchObject({
      volume: layout.volume,
      pdfPage: layout.page,
      thumbnail: layout.id + ".webp",
    });
    expect(
      readFileSync("public/template-thumbnails/" + layout.id + ".webp")
        .subarray(0, 4)
        .toString(),
    ).toBe("RIFF");
  }
});
it("applies an available story layout without changing text, images, ordering or the source issue", () => {
  const original = structuredClone(sampleIssue);
  const story = original.sections[0].stories[0];
  const result = applyStudioLayout(original, "t04", story.id);
  expect(result.dirty).toBe(true);
  expect(result.issue.sections[0].stories[0]).toEqual({
    ...story,
    template: "t04",
    pageTemplate: "inherit",
    continuationTemplate: "inherit",
  });
  expect(original).toEqual(sampleIssue);
  expect(result.issue.sections.slice(1)).toEqual(original.sections.slice(1));
});
it("does not change content for cover/contents settings or unavailable/missing-story actions", () => {
  for (const action of ["cover", "contents", "t05", "bad", "opener"]) {
    const result = applyStudioLayout(sampleIssue, action);
    expect(result.issue).toBe(sampleIssue);
    expect(result.dirty).toBe(false);
  }
  expect(applyStudioLayout(sampleIssue, "cover").target).toBe("cover-design");
  expect(applyStudioLayout(sampleIssue, "t05").error).toContain(
    "not available",
  );
});
it("keeps an already-selected layout clean and translates UI warnings without altering stored messages", () => {
  const issue = applyStudioLayout(
    sampleIssue,
    "opener",
    sampleIssue.sections[0].stories[0].id,
  ).issue;
  expect(
    applyStudioLayout(issue, "opener", issue.sections[0].stories[0].id).dirty,
  ).toBe(false);
  const message = "Missing local image: internal-image-id. Re-select it.";
  expect(friendlyPreviewMessage(message)).toContain("uploaded image");
  expect(friendlyPreviewMessage(message)).not.toContain("internal-image-id");
  expect(message).toContain("internal-image-id");
});
