import { describe, expect, it, vi, afterEach } from "vitest";
import legacy from "./fixtures/legacy-volume-21.json";
import { migrateIssue, move, newStory, issueSchema } from "../src/domain/issue";
import { LocalIssueRepository } from "../src/repositories/issues";
import {
  buildRenderModel,
  resolveStoryDesign,
} from "../src/magazine/templates";
import { printedFolio } from "../src/magazine/folios";
import { designTokens } from "../src/magazine/tokens";
import { MemoryMediaAssetRepository } from "../src/media/repository";
const storageKey = "ecu-connect:issues:v1";
afterEach(() => vi.unstubAllGlobals());
describe("non-destructive versioned migration", () => {
  it("migrates the real Phase 1 sample without changing any content, order, IDs or dates", () => {
    const issue = migrateIssue(legacy);
    expect(issue.schemaVersion).toBe(2);
    expect(issue).toMatchObject(legacy);
    expect(legacy).not.toHaveProperty("schemaVersion");
    expect(
      issue.sections.flatMap((s) => s.stories.flatMap((t) => t.blocks)),
    ).toEqual(
      legacy.sections.flatMap((s) => s.stories.flatMap((t) => t.blocks)),
    );
    expect(issue.sections.map((s) => s.template)).toEqual(
      legacy.sections.map((s) => s.template),
    );
    expect(issue.sections.every((s) => s.theme === "inherit")).toBe(true);
    expect(
      issue.sections
        .flatMap((s) => s.stories)
        .every(
          (s) =>
            s.enabled &&
            s.template === "inherit" &&
            s.pageTemplate === "inherit" &&
            s.media.length === 0,
        ),
    ).toBe(true);
  });
  it("is idempotent and accepts explicitly marked v1", () => {
    expect(migrateIssue(migrateIssue(legacy))).toEqual(migrateIssue(legacy));
    expect(migrateIssue({ ...legacy, schemaVersion: 1 })).toEqual(
      migrateIssue(legacy),
    );
  });
  it("preserves v2 selections, furniture, disabled stories and media references", () => {
    const issue = migrateIssue(legacy);
    issue.theme = "ecu-dark";
    issue.furniture.header = false;
    const story = issue.sections[0].stories[0];
    story.enabled = false;
    story.template = "paper";
    story.pageTemplate = "article";
    story.continuationTemplate = "paper";
    story.theme = "cream";
    story.media = [
      {
        assetId: "portrait",
        alt: "Portrait",
        caption: "Caption",
        credit: "Credit",
        focalPoint: { x: 0.2, y: 0.8 },
      },
    ];
    expect(migrateIssue(JSON.parse(JSON.stringify(issue)))).toEqual(issue);
  });
  it("does not rewrite local storage on read and saves only validated v2 after an edit", async () => {
    const store = new Map([[storageKey, JSON.stringify([legacy])]]);
    const setItem = vi.fn((k: string, v: string) => store.set(k, v));
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem,
    });
    const repo = new LocalIssueRepository();
    const issue = (await repo.list())[0];
    expect(setItem).not.toHaveBeenCalled();
    await repo.save({ ...issue, title: "Edited title" });
    const saved = JSON.parse(store.get(storageKey)!)[0];
    expect(saved.schemaVersion).toBe(2);
    expect(saved.sections[0].stories[0].blocks).toEqual(
      legacy.sections[0].stories[0].blocks,
    );
  });
  it("protects future versions and unknown fields from destructive saves", async () => {
    for (const bad of [
      { ...legacy, schemaVersion: 3 },
      { ...legacy, schemaVersion: null },
      { ...legacy, unrecognizedEditorialData: "keep me" },
    ]) {
      const raw = JSON.stringify([bad]);
      const setItem = vi.fn();
      vi.stubGlobal("localStorage", { getItem: () => raw, setItem });
      await expect(
        new LocalIssueRepository().save(migrateIssue(legacy)),
      ).rejects.toThrow();
      expect(setItem).not.toHaveBeenCalled();
    }
  });
  it("rejects unsupported template/theme IDs instead of silently falling back", () => {
    expect(() => migrateIssue({ ...legacy, theme: "unknown" })).toThrow();
    const issue = migrateIssue(legacy);
    expect(
      issueSchema.safeParse({
        ...issue,
        sections: [{ ...issue.sections[0], template: "T17-unimplemented" }],
      }).success,
    ).toBe(false);
  });
});
describe("template, master and theme resolution", () => {
  it("uses section template and issue theme by default", () => {
    const issue = migrateIssue(legacy),
      section = issue.sections[0];
    expect(
      resolveStoryDesign(issue.theme, section, section.stories[0]),
    ).toMatchObject({
      template: "feature",
      theme: "ecu-light",
      pageTemplate: "article",
      continuationTemplate: "article",
    });
  });
  it("resolves story overrides before section overrides and picks separate continuation masters", () => {
    const issue = migrateIssue(legacy),
      section = issue.sections[0],
      story = section.stories[0];
    section.theme = "lavender";
    section.template = "paper";
    expect(resolveStoryDesign("ecu-dark", section, story)).toMatchObject({
      theme: "lavender",
      pageTemplate: "paper",
      continuationTemplate: "paper",
    });
    story.theme = "cream";
    story.template = "bulletin";
    story.pageTemplate = "paper";
    story.continuationTemplate = "article";
    expect(resolveStoryDesign("ecu-dark", section, story)).toMatchObject({
      template: "bulletin",
      theme: "cream",
      pageTemplate: "paper",
      continuationTemplate: "article",
    });
  });
  it("preserves enabled-story order through section/story reorder and omission", () => {
    const issue = migrateIssue(legacy);
    issue.sections = move(issue.sections, 1, -1);
    issue.sections[0].stories.push({ ...newStory(), title: "Second story" });
    issue.sections[0].stories = move(issue.sections[0].stories, 1, -1);
    issue.sections[1].enabled = false;
    issue.sections[2].stories[0].enabled = false;
    expect(buildRenderModel(issue).stories.map((s) => s.story.title)).toEqual([
      "Second story",
      legacy.sections[1].stories[0].title,
      ...legacy.sections.slice(3).map((s) => s.stories[0].title),
    ]);
  });
});
describe("A4 and printed folios", () => {
  it("keeps the original A4 dimensions and starts folio 1 at physical page 3", () => {
    expect(designTokens.page).toMatchObject({
      widthMm: 210,
      heightMm: 297,
      sideMm: 15,
    });
    expect(printedFolio(1, "cover")).toBeNull();
    expect(printedFolio(2, "contents")).toBeNull();
    expect(printedFolio(3, "article")).toBe(1);
    expect(printedFolio(12, "article")).toBe(10);
    expect(printedFolio(13, "contents")).toBeNull();
    expect(() => printedFolio(2, "article")).toThrow();
  });
});
describe("local media asset boundary", () => {
  it("stores and returns independent binary data without embedding it in issue JSON", async () => {
    const repo = new MemoryMediaAssetRepository();
    const bytes = new Uint8Array([1, 2, 3]);
    await repo.put({
      asset: {
        id: "photo",
        name: "photo.png",
        mimeType: "image/png",
        width: 10,
        height: 20,
        byteLength: 3,
      },
      bytes,
    });
    bytes[0] = 9;
    const item = await repo.get("photo");
    expect(item?.bytes[0]).toBe(1);
    item!.bytes[1] = 9;
    expect((await repo.get("photo"))?.bytes[1]).toBe(2);
    expect(await repo.list()).toHaveLength(1);
    await repo.remove("photo");
    expect(await repo.get("photo")).toBeNull();
  });
  it("rejects mismatched binary metadata", async () => {
    const repo = new MemoryMediaAssetRepository();
    await expect(
      repo.put({
        asset: {
          id: "bad",
          name: "bad.png",
          mimeType: "image/png",
          width: 10,
          height: 10,
          byteLength: 3,
        },
        bytes: new Uint8Array([1]),
      }),
    ).rejects.toThrow("byte length");
  });
});
