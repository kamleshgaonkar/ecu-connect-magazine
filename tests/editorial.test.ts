import { expect, it } from "vitest";
import { sampleIssue } from "../src/domain/sample";
import { migrateIssue } from "../src/domain/issue";
import { buildRenderModel } from "../src/magazine/templates";
import { issueMediaReferences } from "../src/media/render";

it("T04 fields round-trip without changing legacy copy or requiring new fields", () => {
  const legacy = structuredClone(sampleIssue);
  expect(migrateIssue(legacy)).toEqual(legacy);
  const story = legacy.sections[0].stories[0];
  story.template = "t04";
  story.editorial = { columns: 2, showTitle: false };
  story.blocks.push({
    id: "ordered-figure",
    type: "figure",
    text: "Figure 1",
    figureHeightMm: 100,
    breakBefore: "column",
    image: {
      assetId: "figure-asset",
      alt: "Approved chart",
      caption: "Caption",
      credit: "Credit",
      fit: "contain",
      focalPoint: { x: 0.5, y: 0.5 },
    },
  });
  const parsed = migrateIssue(JSON.parse(JSON.stringify(legacy)));
  expect(parsed).toEqual(legacy);
  expect(buildRenderModel(parsed).stories[0]).toMatchObject({
    template: "t04",
    pageTemplate: "editorial",
    continuationTemplate: "editorial",
  });
  expect(
    issueMediaReferences(parsed).some((r) => r.assetId === "figure-asset"),
  ).toBe(true);
});

it("rejects invalid editorial geometry instead of fitting or stripping it", () => {
  const issue = structuredClone(sampleIssue);
  expect(() =>
    migrateIssue({
      ...issue,
      sections: [
        {
          ...issue.sections[0],
          stories: [
            { ...issue.sections[0].stories[0], editorial: { columns: 3 } },
          ],
        },
      ],
    }),
  ).toThrow();
  issue.sections[0].stories[0].blocks.push({
    id: "bad-height",
    type: "figure",
    text: "",
    figureHeightMm: 200,
  });
  expect(() => migrateIssue(issue)).toThrow();
});
