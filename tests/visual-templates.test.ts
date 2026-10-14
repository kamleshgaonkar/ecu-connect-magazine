import { describe, it, expect } from "vitest";
import { migrateIssue } from "../src/domain/issue";
import { sampleIssue } from "../src/domain/sample";
import { buildRenderModel } from "../src/magazine/templates";
import { prepareRenderIssue, imageDataUrl } from "../src/media/render";
import { MemoryMediaAssetRepository } from "../src/media/repository";
import { renderAssetSchema } from "../src/domain/media";
import { LocalIssueRepository } from "../src/repositories/issues";
const reference = {
  assetId: "photo",
  alt: "Local photograph",
  caption: "",
  credit: "",
  focalPoint: { x: 0.2, y: 0.8 },
  fit: "cover" as const,
};
describe("visual templates and compatible media", () => {
  it("round-trips cover, contents and opener choices without changing existing copy", () => {
    const issue = structuredClone(sampleIssue);
    issue.cover = {
      headline: "Cover override",
      supportingText: "Supporting copy",
      edition: "FORTNIGHTLY EDITION",
      surface: "sky",
      image: reference,
    };
    issue.sections[0].stories[0].visual = {
      summary: "Contents summary",
      thumbnail: reference,
      hero: reference,
      position: "right",
      heroLayout: "full",
    };
    const saved = migrateIssue(JSON.parse(JSON.stringify(issue)));
    expect(saved).toEqual(issue);
    expect(saved.sections[0].stories[0].blocks).toEqual(
      sampleIssue.sections[0].stories[0].blocks,
    );
    expect(migrateIssue(sampleIssue).cover).toBeUndefined();
  });
  it("numbers only included nonempty sections in their current order and uses plain continuations", () => {
    const issue = structuredClone(sampleIssue);
    issue.sections.reverse();
    issue.sections[1].enabled = false;
    issue.sections[2].stories.forEach((s) => (s.enabled = false));
    issue.sections[0].template = "opener";
    const model = buildRenderModel(issue);
    expect(model.stories[0]).toMatchObject({
      sectionNumber: 1,
      sectionStart: true,
      pageTemplate: "opener",
      continuationTemplate: "article",
    });
    expect([...new Set(model.stories.map((s) => s.sectionNumber))]).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(model.stories.map((s) => s.sectionName)).not.toContain(
      issue.sections[1].name,
    );
  });
  it("resolves distinct referenced image bytes once without mutating stored issue data", async () => {
    const repo = new MemoryMediaAssetRepository();
    const bytes = new Uint8Array([1, 2, 3]);
    await repo.put({
      asset: {
        id: "photo",
        name: "photo.png",
        mimeType: "image/png",
        width: 10,
        height: 10,
        byteLength: 3,
      },
      bytes,
    });
    const issue = structuredClone(sampleIssue);
    issue.cover = {
      headline: "",
      supportingText: "",
      edition: "",
      surface: "white",
      image: reference,
      logo: reference,
    };
    const prepared = await prepareRenderIssue(issue, repo);
    expect(prepared.renderAssets).toHaveLength(1);
    expect(prepared.renderAssets![0].dataUrl).toBe(
      "data:image/png;base64,AQID",
    );
    expect(issue.renderAssets).toBeUndefined();
    expect(imageDataUrl("image/png", bytes)).toBe("data:image/png;base64,AQID");
  });
  it("rejects external URLs, MIME mismatches and inconsistent image transport metadata", () => {
    const value = {
      asset: {
        id: "photo",
        name: "p.png",
        mimeType: "image/png",
        width: 1,
        height: 1,
        byteLength: 3,
      },
      dataUrl: "data:image/png;base64,AQID",
    };
    expect(renderAssetSchema.parse(value)).toEqual(value);
    for (const dataUrl of [
      "https://example.com/image.png",
      "data:image/jpeg;base64,AQID",
      "data:image/png;base64,AQ==",
    ])
      expect(() => renderAssetSchema.parse({ ...value, dataUrl })).toThrow();
    expect(() =>
      migrateIssue({
        ...sampleIssue,
        cover: { image: { ...reference, focalPoint: { x: 2, y: 0.5 } } },
      }),
    ).toThrow();
  });
  it("never stores transient render payloads in localStorage", async () => {
    const data = new Map<string, string>();
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
      },
    });
    try {
      const issue = structuredClone(sampleIssue);
      issue.renderAssets = [];
      await new LocalIssueRepository().save(issue);
      expect(
        JSON.parse(data.get("ecu-connect:issues:v1")!)[0],
      ).not.toHaveProperty("renderAssets");
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: original,
      });
    }
  });
});
