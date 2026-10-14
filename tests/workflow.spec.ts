import { test, expect } from "@playwright/test";
import { magazineDocument } from "../src/magazine/document";
import { newStory } from "../src/domain/issue";
import { sampleIssue } from "../src/domain/sample";
test("create, structure, persist, preview and export an issue", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Connections that move us").first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create issue", exact: true })
    .first()
    .click();
  await page.getByLabel("Issue title").fill("An editorial journey");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create issue", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "An editorial journey" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add section", exact: true }).click();
  await page.getByRole("button", { name: "Add story", exact: true }).click();
  await page
    .getByLabel("Headline", { exact: true })
    .fill("People make the difference");
  await page
    .getByLabel("Block 1 text")
    .fill("A test story with a clear editorial purpose. ".repeat(300));
  await page.getByRole("button", { name: "Save issue" }).click();
  await expect(page.getByRole("status")).toContainText("Saved locally");
  await page.reload();
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(
    "People make the difference",
  );
  await page.getByRole("tab", { name: "Preview & export" }).click();
  await expect(page.getByText("Layout checked.")).toBeVisible();
  // Re-mounting the iframe must recover its measured result reliably.
  await page.getByRole("tab", { name: "Edit content" }).click();
  await page.getByRole("tab", { name: "Preview & export" }).click();
  await expect(page.getByText("Layout checked.")).toBeVisible();
  const frame = page.frameLocator("iframe");
  expect(await frame.locator(".page").count()).toBeGreaterThan(3); // cover, contents and measured story pages
  const start = await frame.locator(".toc-number").first().textContent();
  expect(start).toBe("01");
  await expect(frame.locator('.page[data-physical-page="3"]')).toHaveAttribute(
    "data-folio",
    "1",
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
  const file = await download.path();
  expect(file).toBeTruthy();
  const fs = await import("node:fs/promises");
  const bytes = await fs.readFile(file!);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(10000);
});
test("measured pagination preserves long content and actual table of contents", async ({
  page,
}) => {
  const issue = structuredClone(sampleIssue);
  issue.sections = issue.sections.slice(0, 2);
  const long =
    "Long story — a thoughtful connection. ".repeat(1800) + "END_OF_STORY";
  issue.sections[0].stories[0].blocks = Array.from(
    { length: Math.ceil(long.length / 18000) },
    (_, i) => ({
      id: `long-block-${i}`,
      type: "paragraph" as const,
      text: long.slice(i * 18000, (i + 1) * 18000),
    }),
  );
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() =>
    Boolean(
      (window as unknown as { __magazineReady: boolean }).__magazineReady,
    ),
  );
  expect(
    await page
      .locator(".page-body .text-block")
      .allTextContents()
      .then((texts) =>
        texts
          .filter((t) => t.includes("Long story") || t.includes("END_OF_STORY"))
          .join(""),
      ),
  ).toBe(long);
  const pages = await page.locator(".page").count();
  expect(pages).toBeGreaterThan(10);
  const second = page.locator(".page").filter({
    has: page.getByRole("heading", {
      name: issue.sections[1].stories[0].title,
      exact: true,
    }),
  });
  const actual = await second.locator(".page-number").textContent();
  expect(await page.locator(".toc-number").nth(1).textContent()).toBe(
    actual?.padStart(2, "0"),
  );
  const result = await page.evaluate(
    () =>
      (window as unknown as { __magazineResult: { warnings: string[] } })
        .__magazineResult,
  );
  expect(result.warnings).toEqual([]);
});
test("excluded sections disappear and cover overflow blocks PDF", async ({
  page,
  request,
}) => {
  const issue = structuredClone(sampleIssue);
  issue.sections[0].enabled = false;
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() =>
    Boolean(
      (window as unknown as { __magazineReady: boolean }).__magazineReady,
    ),
  );
  await expect(
    page.getByRole("heading", {
      name: issue.sections[0].stories[0].title,
      exact: true,
    }),
  ).toHaveCount(0);
  issue.title = "W".repeat(150);
  const response = await request.post("/api/export", { data: issue });
  expect(response.status()).toBe(422);
  expect((await response.json()).error).toContain("Cover title");
  const invalid = await request.post("/api/export", { data: { title: "" } });
  expect(invalid.status()).toBe(400);
});
test("dashboard and editor are usable on a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Issues", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: /Connections that move us/ }).click();
  await expect(
    page.getByRole("button", { name: "Add story", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
for (const storyCount of [2, 25]) {
  test(`${storyCount === 2 ? "single-page" : "multi-page"} contents precede articles with accurate folios and preserved rich text`, async ({
    page,
    request,
  }) => {
    const issue = structuredClone(sampleIssue);
    issue.sections = issue.sections.slice(0, 1);
    const strongText = "A carefully considered editorial detail. ".repeat(350);
    issue.sections[0].stories = Array.from({ length: storyCount }, (_, i) => ({
      ...newStory(),
      id: `test-story-${i}`,
      title: `Editorial dispatch ${i + 1}`,
      subtitle: "",
      byline: "",
      blocks: [
        {
          id: `test-block-${i}`,
          type: "paragraph" as const,
          text:
            i === 0
              ? `**${strongText}** *Editorial emphasis* <script>not executable</script>`
              : "An illustrated local sample.",
        },
      ],
    }));
    await page.setContent(magazineDocument(issue));
    await page.waitForFunction(() =>
      Boolean(
        (window as unknown as { __magazineReady: boolean }).__magazineReady,
      ),
    );
    expect(
      await page
        .locator(".page-body .text-block strong")
        .allTextContents()
        .then((t) => t.join("")),
    ).toBe(strongText);
    await expect(page.locator(".text-block em")).toHaveText(
      "Editorial emphasis",
    );
    const contentsCount = await page
      .locator('.page[data-kind="contents"]')
      .count();
    if (storyCount === 2) expect(contentsCount).toBe(1);
    else expect(contentsCount).toBeGreaterThan(1);
    const frontMatterPages = contentsCount + 1;
    const pages = await page.locator(".page").evaluateAll((nodes) =>
      nodes.map((node) => ({
        kind: node.getAttribute("data-kind"),
        physical: Number(node.getAttribute("data-physical-page")),
        folio: node.getAttribute("data-folio"),
        visibleFolio: node.querySelector(".page-number")?.textContent ?? "",
      })),
    );
    expect(pages.slice(0, frontMatterPages).map((p) => p.kind)).toEqual([
      "cover",
      ...Array(contentsCount).fill("contents"),
    ]);
    pages.forEach((p, index) => {
      expect(p.physical).toBe(index + 1);
      if (index < frontMatterPages) {
        expect(p.folio).toBeNull();
        expect(p.visibleFolio).toBe("");
      } else {
        expect(p.kind).toBe("article");
        expect(p.folio).toBe(String(index + 1 - frontMatterPages));
        expect(p.visibleFolio).toBe(p.folio);
      }
    });
    expect(pages.length - frontMatterPages).toBeGreaterThan(storyCount);
    const storyPages = await page.evaluate(
      () =>
        (
          window as unknown as {
            __magazineResult: {
              storyPages: Record<
                string,
                { physicalPage: number; folio: number }
              >;
            };
          }
        ).__magazineResult.storyPages,
    );
    for (let index = 0; index < storyCount; index++) {
      const actual = await page
        .locator(".page")
        .filter({
          has: page.getByRole("heading", {
            name: `Editorial dispatch ${index + 1}`,
            exact: true,
          }),
        })
        .locator(".page-number")
        .textContent();
      const entry = storyPages[`test-story-${index}`];
      expect(entry.folio).toBe(entry.physicalPage - frontMatterPages);
      expect(pages[entry.physicalPage - 1].folio).toBe(String(entry.folio));
      expect(actual).toBe(String(entry.folio));
      expect(await page.locator(".toc-number").nth(index).textContent()).toBe(
        actual?.padStart(2, "0"),
      );
    }
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __magazineResult: { warnings: string[] } })
            .__magazineResult.warnings,
      ),
    ).toEqual([]);
    const exported = await request.post("/api/export", { data: issue });
    expect(exported.status()).toBe(200);
    expect((await exported.body()).subarray(0, 4).toString()).toBe("%PDF");
  });
}
