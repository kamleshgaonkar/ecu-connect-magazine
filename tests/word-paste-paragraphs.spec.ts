import { test, expect, type Page } from "@playwright/test";
import { newIssue, newSection, id, type Issue } from "../src/domain/issue";
async function open(page: Page, editorial = false) {
  const issue = newIssue("Word paragraph regression", 21);
  issue.sections = [newSection("Cover Story")];
  const story = issue.sections[0].stories[0];
  story.title = "Paragraph review";
  if (editorial) {
    delete story.pagePair;
    story.pageTemplate = "editorial";
    story.continuationTemplate = "editorial";
    story.template = "t04";
  }
  story.contentMode = "continuous";
  story.blocks = [
    {
      id: id(),
      type: "paragraph",
      text: "Saved wording.\nSaved intentional break.",
      rich: {
        runs: [{ text: "Saved wording.\nSaved intentional break." }],
        align: "left",
      },
    },
  ];
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.addInitScript((data) => {
    if (window === window.top && !localStorage.getItem("ecu-connect:issues:v1"))
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, issue);
  await page.goto(`/issues/${issue.id}`);
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  return { issue, story };
}
async function paste(page: Page, html: string, text = "") {
  const body = page.getByRole("textbox", { name: "Complete story content" });
  await body.focus();
  await page.keyboard.press("Control+A");
  await body.evaluate(
    (node, data) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/html", data.html);
      clipboardData.setData("text/plain", data.text);
      node.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    { html, text },
  );
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
}
async function save(page: Page): Promise<Issue> {
  const button = page.getByRole("button", {
    name: "Save Magazine",
    exact: true,
  });
  if (await button.isEnabled()) await button.click();
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0],
  );
}
test("Word source wraps and indentation normalize, real paragraphs/breaks/marks/lists agree with preview and reload", async ({
  page,
}) => {
  const { story } = await open(page);
  await paste(
    page,
    `
    <div class="WordSection1">
      <p class="MsoNormal" style="margin-left:72pt;text-indent:36pt;margin-top:24pt;margin-bottom:0">
        <span style="mso-tab-count:1">&nbsp;&nbsp;&nbsp;</span><b>Alex Morgan</b>,
        <i>Country Manager</i> shares<span style="mso-tab-count:1">&nbsp;&nbsp;&nbsp;</span><u>our perspective</u>
        across regions.<o:p>&nbsp;</o:p>
      </p>
      <p style="mso-list:none;margin-left:90pt">Operations remain ordinary prose.</p>
      <p style="mso-list:Ignore;text-indent:30pt">Our next paragraph stays separate.</p>
      <p class="MsoListParagraph" style="mso-list:l9 level1 lfo8">Our team is not a bullet.</p>
      <p class="MsoListParagraph">1. This is ordinary numbered prose.</p>
      <p>Contact <b>Alex Morgan</b><br style="mso-special-character:line-break">
        Country Manager<br>Second intentional line.</p>
      <p style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">•<span style="mso-tab-count:1">&nbsp;&nbsp;&nbsp;</span></span><b>First list item</b></p>
      <p style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">•&nbsp;</span>Second list item</p>
      <p>After the list.</p>
      <ul><li>Native <i>list item</i></li><li>Another native item</li></ul>
    </div>`,
  );
  const body = page.getByRole("textbox", { name: "Complete story content" });
  const expected = [
    "Alex Morgan, Country Manager shares our perspective across regions.",
    "Operations remain ordinary prose.",
    "Our next paragraph stays separate.",
    "Our team is not a bullet.",
    "1. This is ordinary numbered prose.",
    "Contact Alex Morgan\nCountry Manager\nSecond intentional line.",
    "First list item\nSecond list item",
    "After the list.",
    "Native list item\nAnother native item",
  ];
  await expect(body.locator(":scope > p")).toHaveCount(7);
  await expect(body.locator(":scope > ul")).toHaveCount(2);
  await expect(body.locator("strong").first()).toHaveText("Alex Morgan");
  await expect(body.locator("em").first()).toHaveText("Country Manager");
  await expect(body.locator("u")).toHaveText("our perspective");
  let saved = await save(page);
  expect(
    saved.sections[0].stories[0].blocks.map((block) => block.text),
  ).toEqual(expected);
  expect(
    saved.sections[0].stories[0].blocks.map((block) => block.type),
  ).toEqual([
    "paragraph",
    "paragraph",
    "paragraph",
    "paragraph",
    "paragraph",
    "paragraph",
    "list",
    "paragraph",
    "list",
  ]);
  const article = page
    .frameLocator("iframe")
    .locator(`#pages [data-story-id="${story.id}"]`);
  for (const block of saved.sections[0].stories[0].blocks) {
    const editorNode = body.locator(`[data-content-id="${block.id}"]`);
    const printed = article.locator(`[data-content-id="${block.id}"]`);
    expect(await editorNode.evaluate((el) => el.tagName)).toBe(
      await printed.evaluate((el) => el.tagName),
    );
    expect(await editorNode.textContent()).toBe(await printed.textContent());
    if (block.type === "paragraph") {
      const spacing = (el: Element) => ({
        margin: getComputedStyle(el).marginBottom,
        indent: getComputedStyle(el).textIndent,
        left: getComputedStyle(el).marginLeft,
      });
      expect(await editorNode.evaluate(spacing)).toEqual(
        await printed.evaluate(spacing),
      );
    }
  }
  await page.reload();
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  saved = await save(page);
  expect(
    saved.sections[0].stories[0].blocks.map((block) => block.text),
  ).toEqual(expected);
});

test("normalization runs only on HTML paste; saved soft breaks and plain-text paragraph breaks remain intact", async ({
  page,
}) => {
  const { story } = await open(page);
  const untouched = await save(page);
  expect(untouched.sections[0].stories[0]).toEqual(story);
  await paste(
    page,
    "",
    "Plain paragraph one.\nPlain paragraph two.\n\nPlain paragraph four.",
  );
  const saved = await save(page);
  expect(
    saved.sections[0].stories[0].blocks.map((block) => block.text),
  ).toEqual([
    "Plain paragraph one.",
    "Plain paragraph two.",
    "",
    "Plain paragraph four.",
  ]);
  await paste(
    page,
    '<p>One <span style="white-space:pre-wrap">intentional\nline</span><br>Next line.</p><p style="mso-list:none" data-word-list="true">Ordinary paragraph.</p>',
  );
  const pre = await save(page);
  expect(pre.sections[0].stories[0].blocks.map((block) => block.text)).toEqual([
    "One intentional\nline\nNext line.",
    "Ordinary paragraph.",
  ]);
  expect(
    pre.sections[0].stories[0].blocks.every(
      (block) => block.type === "paragraph",
    ),
  ).toBe(true);
});

test("pasted paragraphs still create and remove measured continuation pages without changing wording", async ({
  page,
  request,
}) => {
  const { story } = await open(page);
  const paragraphs = Array.from(
    { length: 60 },
    (_, index) =>
      `Paragraph ${index + 1}. ` +
      "Original words remain in their original order. ".repeat(20),
  );
  await paste(
    page,
    paragraphs
      .map(
        (text) =>
          `<p style="margin-left:72pt;text-indent:36pt">\n  ${text}\n</p>`,
      )
      .join("\n"),
  );
  const frame = page.frameLocator("iframe");
  const pages = frame.locator(`#pages [data-story-id="${story.id}"]`);
  await expect.poll(() => pages.count()).toBeGreaterThan(2);
  let saved = await save(page);
  expect(
    saved.sections[0].stories[0].blocks.map((block) => block.text),
  ).toEqual(paragraphs.map((text) => text.trim()));
  const printed = await pages.locator(".ecu-content-text").allTextContents();
  expect(printed.join("").replace(/\s+/g, " ").trim()).toBe(
    paragraphs
      .map((text) => text.trim())
      .join("")
      .replace(/\s+/g, " ")
      .trim(),
  );
  await paste(
    page,
    "<p>Short first paragraph.</p><p>Short second paragraph.<br>Intentional line.</p>",
  );
  await expect(pages).toHaveCount(1);
  saved = await save(page);
  expect(
    saved.sections[0].stories[0].blocks.map((block) => block.text),
  ).toEqual([
    "Short first paragraph.",
    "Short second paragraph.\nIntentional line.",
  ]);
  const exported = await request.post("/api/export", { data: saved });
  expect(exported.status()).toBe(200);
});

test("editorial paragraph spacing follows its existing template without changing the preview", async ({
  page,
}) => {
  const { story } = await open(page, true);
  await paste(
    page,
    "<p>First editorial paragraph.</p><p>Second editorial paragraph.</p>",
  );
  const body = page.getByRole("textbox", { name: "Complete story content" });
  const article = page
    .frameLocator("iframe")
    .locator(`#pages [data-story-id="${story.id}"]`);
  const gap = (el: Element) => getComputedStyle(el).marginBottom;
  expect(await body.locator(":scope > p").first().evaluate(gap)).toBe(
    await article.locator(".ecu-content-text").first().evaluate(gap),
  );
  await expect(body.locator(":scope > p").first()).toHaveCSS(
    "margin-bottom",
    "15.1181px",
  );
});
