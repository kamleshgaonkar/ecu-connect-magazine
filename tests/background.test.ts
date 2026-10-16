import { describe, it, expect } from "vitest";
import {
  backgroundSchema,
  pageBackgroundsSchema,
} from "../src/domain/background";
import { migrateIssue } from "../src/domain/issue";
import { sampleIssue } from "../src/domain/sample";
import { issueMediaReferences, prepareRenderIssue } from "../src/media/render";
import type { MediaAssetData, MediaReference } from "../src/domain/media";
const reference: MediaReference = {
  assetId: "background",
  alt: "",
  caption: "",
  credit: "",
  focalPoint: { x: 0.4, y: 0.7 },
};
describe("background design compatibility and transport", () => {
  it("leaves old data untouched and validates mode, colours, ranges and page indices", () => {
    expect(migrateIssue(sampleIssue)).toEqual(sampleIssue);
    expect(backgroundSchema.parse({}).mode).toBe("default");
    expect(pageBackgroundsSchema.parse(JSON.parse('{"__proto__":{}}'))).toEqual(
      {},
    );
    for (const invalid of [
      { colour: "red" },
      { coverage: 0 },
      { opacity: 101 },
      { fadeStart: -1 },
      { direction: 361 },
      { fadeStrength: -1 },
      { mode: "script" },
    ])
      expect(backgroundSchema.safeParse(invalid).success).toBe(false);
    for (const key of ["-1", "1.5", "01", "300"])
      expect(pageBackgroundsSchema.safeParse({ [key]: {} }).success).toBe(
        false,
      );
  });
  it("round-trips independent page overrides without altering metadata or content", () => {
    const issue = structuredClone(sampleIssue);
    const before = structuredClone(issue.sections[0].stories[0]);
    issue.sections[0].stories[0].background = backgroundSchema.parse({
      mode: "solid",
      colour: "#FFDD00",
    });
    issue.sections[0].stories[0].pageBackgrounds = {
      "1": backgroundSchema.parse({ mode: "gradient", direction: 45 }),
      "2": backgroundSchema.parse({ mode: "default" }),
    };
    const story = migrateIssue(JSON.parse(JSON.stringify(issue))).sections[0]
      .stories[0];
    expect(story.pageBackgrounds).toEqual(
      issue.sections[0].stories[0].pageBackgrounds,
    );
    const { background, pageBackgrounds, ...original } = story;
    expect(original).toEqual(before);
    expect(background!.colour).toBe("#FFDD00");
    expect(pageBackgrounds!["2"].mode).toBe("default");
  });
  it("resolves referenced local background bytes once across inherited pages and overrides", async () => {
    const issue = structuredClone(sampleIssue);
    issue.sections[0].stories[0].background = backgroundSchema.parse({
      mode: "image",
      image: reference,
    });
    issue.sections[0].stories[0].pageBackgrounds = {
      "2": backgroundSchema.parse({ mode: "image", image: reference }),
    };
    const value: MediaAssetData = {
      asset: {
        id: "background",
        name: "test.png",
        mimeType: "image/png",
        width: 1,
        height: 1,
        byteLength: 3,
      },
      bytes: new Uint8Array([1, 2, 3]),
    };
    let reads = 0;
    const result = await prepareRenderIssue(issue, {
      list: async () => [],
      get: async () => {
        reads++;
        return value;
      },
      put: async () => {},
      remove: async () => {},
    });
    expect(
      issueMediaReferences(issue).filter((r) => r.assetId === "background"),
    ).toHaveLength(2);
    expect(reads).toBe(1);
    expect(result.renderAssets).toHaveLength(1);
    expect(result.renderAssets![0].dataUrl).toBe("data:image/png;base64,AQID");
  });
});
