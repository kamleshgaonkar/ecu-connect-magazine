import { test, expect } from "@playwright/test";
import legacy from "./fixtures/legacy-volume-21.json";
import { migrateIssue } from "../src/domain/issue";
import { magazineDocument } from "../src/magazine/document";
test("v1 editing migrates safely and saved theme/master selections drive preview and PDF", async ({
  page,
}) => {
  await page.addInitScript((data) => {
    if (localStorage.getItem("ecu-connect:issues:v1") === null)
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, legacy);
  await page.goto("/");
  await page.getByRole("link", { name: /Connections that move us/ }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0]
          .schemaVersion,
    ),
  ).toBeUndefined();
  await expect(
    page.getByLabel("Headline", { exact: true }).first(),
  ).toHaveValue(legacy.sections[0].stories[0].title);
  await page
    .getByText("Magazine appearance & page furniture", { exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Issue theme", exact: true })
    .selectOption("ecu-blue");
  await page
    .getByRole("combobox", { name: "Section theme", exact: true })
    .selectOption("lavender");
  await page
    .getByRole("combobox", { name: "Editorial template", exact: true })
    .selectOption("paper");
  await page
    .getByText("Story layout & appearance", { exact: true })
    .first()
    .click();
  await page
    .getByRole("combobox", { name: "Story template", exact: true })
    .first()
    .selectOption("editorial");
  await page
    .getByRole("combobox", { name: "Story theme", exact: true })
    .first()
    .selectOption("cream");
  await page
    .getByRole("combobox", { name: "Opening page master", exact: true })
    .first()
    .selectOption("paper");
  await page
    .getByRole("combobox", { name: "Continuation page master", exact: true })
    .first()
    .selectOption("article");
  const long =
    "A thoughtful connection keeps every editorial detail visible. ".repeat(
      260,
    );
  await page
    .getByRole("textbox", { name: "Block 1 text", exact: true })
    .first()
    .fill(long);
  await page.getByRole("button", { name: "Save issue" }).click();
  await page.reload();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0],
  );
  expect(saved.schemaVersion).toBe(2);
  expect(saved.sections[1].stories[0].blocks).toEqual(
    legacy.sections[1].stories[0].blocks,
  );
  await page
    .getByText("Story layout & appearance", { exact: true })
    .first()
    .click();
  await expect(
    page
      .getByRole("combobox", { name: "Opening page master", exact: true })
      .first(),
  ).toHaveValue("paper");
  await expect(
    page.getByRole("combobox", { name: "Story theme", exact: true }).first(),
  ).toHaveValue("cream");
  await expect(page.getByText("Layout checked.")).toBeVisible();
  const frame = page.frameLocator("iframe");
  const first = frame.locator(".page").nth(2);
  await expect(first).toHaveAttribute("data-physical-page", "3");
  await expect(first).toHaveAttribute("data-folio", "1");
  await expect(first).toHaveAttribute("data-master", "paper");
  await expect(first).toHaveAttribute("data-theme", "cream");
  await expect(first).toHaveCSS("background-color", "rgb(251, 241, 221)");
  await expect(
    frame
      .locator('.page[data-story-id="story-0"][data-master="article"]')
      .first(),
  ).toBeVisible();
  await expect(frame.locator('.page[data-story-id="story-1"]')).toHaveAttribute(
    "data-theme",
    "ecu-blue",
  );
  await expect(frame.locator(".toc-number").first()).toHaveText("01");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
});
test("furniture switches and disabled stories do not corrupt actual folios or contents", async ({
  page,
}) => {
  const issue = migrateIssue(legacy);
  issue.sections = issue.sections.slice(0, 2);
  issue.sections[0].stories[0].enabled = false;
  issue.furniture = {
    header: false,
    footer: false,
    folios: false,
    topAccent: false,
  };
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  await expect(
    page.locator(".section-header,.page-footer,.top-accent"),
  ).toHaveCount(0);
  await expect(page.locator(".page").nth(2)).toHaveAttribute("data-folio", "1");
  await expect(page.locator(".toc-number")).toHaveText("01");
  await expect(
    page.getByRole("heading", {
      name: issue.sections[0].stories[0].title,
      exact: true,
    }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.__magazineResult?.warnings)).toEqual(
    [],
  );
});
test("reordering and page-master overrides preserve content on continuation pages", async ({
  page,
}) => {
  const issue = migrateIssue(legacy);
  issue.sections = issue.sections.slice(0, 2).reverse();
  const s = issue.sections[0].stories[0];
  s.pageTemplate = "paper";
  s.continuationTemplate = "article";
  s.theme = "ecu-dark";
  const text = "Keep every word and its deliberate meaning. ".repeat(400);
  s.blocks = [{ id: "long-test", type: "paragraph", text }];
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  const pages = page.locator(`[data-story-id="${s.id}"]`);
  expect(await pages.count()).toBeGreaterThan(1);
  await expect(pages.first()).toHaveAttribute("data-master", "paper");
  await expect(pages.nth(1)).toHaveAttribute("data-master", "article");
  await expect(page.locator(".toc-row").first()).toContainText(s.title);
  await expect(pages.first().locator(".page-number")).toHaveText("1");
  expect((await pages.locator(".text-block").allTextContents()).join("")).toBe(
    text,
  );
  expect(await page.evaluate(() => window.__magazineResult?.warnings)).toEqual(
    [],
  );
});
test("unsupported future data and unresolved media fail export explicitly", async ({
  request,
}) => {
  const issue = migrateIssue(legacy);
  issue.sections[0].stories[0].media = [
    {
      assetId: "pending-image",
      alt: "A pending portrait",
      caption: "",
      credit: "",
      focalPoint: { x: 0.5, y: 0.5 },
    },
  ];
  const media = await request.post("/api/export", { data: issue });
  expect(media.status()).toBe(422);
  expect((await media.json()).error).toContain("Missing local image");
  const future = await request.post("/api/export", {
    data: { ...issue, schemaVersion: 3 },
  });
  expect(future.status()).toBe(400);
});
test("invalid unsaved details show a recoverable preview error without losing edits", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Connections that move us/ }).click();
  await page.getByLabel("Issue title", { exact: true }).fill("");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Preview needs a nonempty issue title" }),
  ).toBeVisible();
  await expect(page.getByLabel("Issue title", { exact: true })).toHaveValue("");
  await page.getByLabel("Issue title", { exact: true }).fill("Recovered draft");
  await expect(page.getByText("Layout checked.")).toBeVisible();
});
