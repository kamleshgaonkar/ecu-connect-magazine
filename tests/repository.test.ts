import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalIssueRepository } from "../src/repositories/issues";
import { newIssue } from "../src/domain/issue";
describe("local persistence adapter", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("seeds only once and does not resurrect deleted content", async () => {
    const repo = new LocalIssueRepository();
    expect(await repo.list()).toHaveLength(1);
    await repo.remove("volume-21-sample");
    expect(await new LocalIssueRepository().list()).toEqual([]);
  });
  it("creates, updates and reads content through a fresh adapter", async () => {
    const repo = new LocalIssueRepository();
    const issue = newIssue("A real draft", 22);
    await repo.save(issue);
    await repo.save({ ...issue, title: "Revised draft" });
    expect((await new LocalIssueRepository().get(issue.id))?.title).toBe(
      "Revised draft",
    );
    expect(await repo.list()).toHaveLength(2);
  });
  it("does not overwrite corrupt data", async () => {
    store.set("ecu-connect:issues:v1", "broken");
    await expect(
      new LocalIssueRepository().save(newIssue("Draft", 23)),
    ).rejects.toThrow();
    expect(store.get("ecu-connect:issues:v1")).toBe("broken");
  });
  it("surfaces quota and storage failures", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("Storage quota exceeded");
      },
    });
    await expect(new LocalIssueRepository().list()).rejects.toThrow(
      "Storage quota exceeded",
    );
  });
});
