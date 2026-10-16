import { test, expect, type Page } from "@playwright/test";
import { newIssue, newSection, id } from "../src/domain/issue";
async function open(page: Page) {
  const issue = newIssue("Continuous editorial", 24);
  issue.sections = [newSection("Cover Story")];
  issue.sections[0].stories[0].title = "Canonical headline";
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript((data) => {
    if (!localStorage.getItem("ecu-connect:issues:v1"))
      localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([data]));
  }, issue);
  await page.goto("/issues/" + issue.id);
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  return issue;
}
async function paste(page: Page, html: string, text = "") {
  const editor = page.getByRole("textbox", { name: "Complete story content" });
  await editor.focus();
  await editor.evaluate(
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
}
test("Word paste preserves useful formatting, strips unsafe styles and saves the whole story independently", async ({
  page,
}) => {
  const issue = await open(page);
  await paste(
    page,
    '<h2 style="font-family:Calibri;position:fixed">Body heading</h2><p style="text-align:center;mso-margin-top-alt:auto"><b>Bold</b> <i>italic</i> <u>underlined</u> <a href="mailto:team@example.test">Email team</a><script>alert(1)</script></p><ol><li>First item</li><li>Second item</li></ol><p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">• Word bullet</p><p>Before Word break<br style="page-break-before:always">After Word break</p>',
  );
  const body = page.getByRole("textbox", { name: "Complete story content" });
  await expect(body.locator("h2")).toHaveText("Body heading");
  await expect(body.locator("strong")).toHaveText("Bold");
  await expect(body.locator("em")).toHaveText("italic");
  await expect(body.locator("u")).toHaveText("underlined");
  await expect(
    body.locator("script,[style*='fixed'],[style*='Calibri']"),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ecu-connect:issues:v1")!)[0],
  );
  expect(saved.sections[0].stories[0].contentMode).toBe("continuous");
  expect(
    saved.sections[0].stories[0].blocks.some(
      (block: { text: string; breakBefore?: string }) =>
        block.text === "After Word break" && block.breakBefore === "page",
    ),
  ).toBe(true);
  expect(saved.sections[0].stories[0].title).toBe("Canonical headline");
  const ids = saved.sections[0].stories[0].blocks.map(
    (b: { id: string }) => b.id,
  );
  await page.reload();
  await expect(body.locator('a[href="mailto:team@example.test"]')).toHaveText(
    "Email team",
  );
  await expect(body).toContainText("Word bullet");
  const after = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("ecu-connect:issues:v1")!,
    )[0].sections[0].stories[0].blocks.map((b: { id: string }) => b.id),
  );
  expect(after).toEqual(ids);
  await body
    .locator("p")
    .filter({ hasText: "After Word break" })
    .evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      node.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
  await page
    .getByRole("toolbar", { name: "Story formatting" })
    .getByRole("button", { name: "Bold", exact: true })
    .click();
  await expect(
    body
      .locator("p")
      .filter({ hasText: "After Word break" })
      .locator("b,strong"),
  ).toHaveText("After Word break");
  await page.getByLabel("Body style", { exact: true }).selectOption("h3");
  await expect(
    body.getByRole("heading", {
      name: "After Word break",
      level: 3,
      exact: true,
    }),
  ).toBeVisible();
  await body.focus();
  await body.press("ControlOrMeta+End");
  await page.keyboard.insertText(" Extra typed text");
  await expect(body).toContainText("Extra typed text");
  await page
    .getByRole("toolbar", { name: "Story formatting" })
    .getByRole("button", { name: "Undo", exact: true })
    .click();
  await expect(body).not.toContainText("Extra typed text");
  await page
    .getByRole("toolbar", { name: "Story formatting" })
    .getByRole("button", { name: "Redo", exact: true })
    .click();
  await expect(body).toContainText("Extra typed text");
  expect(issue.sections[0].stories[0].blocks).toEqual([]);
});

test("rich body flows from the section opening, preserves marks, manual breaks, overrides and final credits", async ({
  page,
  request,
}) => {
  const { magazineDocument } = await import("../src/magazine/document");
  const { backgroundSchema } = await import("../src/domain/background");
  const issue = newIssue("Measured rich text", 24);
  issue.sections = [newSection("Cover Story")];
  const story = issue.sections[0].stories[0];
  story.title = "Story opening";
  story.contentMode = "continuous";
  story.byline = "Editorial Team | editorial@example.test";
  const text = "Actual measured content with rich formatting. ".repeat(450);
  story.blocks = [
    {
      id: id(),
      type: "heading",
      text: "Together heading",
      rich: { runs: [{ text: "Together heading" }], align: "left", level: 2 },
    },
    {
      id: id(),
      type: "paragraph",
      text,
      rich: { runs: [{ text, bold: true }], align: "justify" },
    },
    {
      id: id(),
      type: "paragraph",
      text: "Manual final page",
      rich: {
        runs: [{ text: "Manual final page", underline: true }],
        align: "left",
      },
      breakBefore: "page",
    },
  ];
  story.pageBackgrounds = {
    "1": backgroundSchema.parse({ mode: "solid", colour: "#eef4ff" }),
  };
  await page.goto("about:blank");
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  const pages = page.locator(`[data-story-id="${story.id}"]`);
  expect(await pages.count()).toBeGreaterThan(2);
  await expect(pages.first()).toHaveClass(/blank-opening-white/);
  await expect(pages.first().locator(".heading")).toHaveText(
    "Together heading",
  );
  const combined = (
    await pages.locator("p.ecu-content-text").allTextContents()
  ).join("");
  expect(combined).toBe(text + "Manual final page");
  await expect(pages.locator("strong").first()).toBeVisible();
  await expect(pages.last().locator("u")).toHaveText("Manual final page");
  await expect(pages.last().locator(".story-author-credit")).toHaveText(
    story.byline,
  );
  expect(await page.evaluate(() => window.__magazineResult!.warnings)).toEqual(
    [],
  );
  expect((await request.post("/api/export", { data: issue })).status()).toBe(
    200,
  );
  story.blocks = [story.blocks[2]];
  story.blocks[0].breakBefore = "auto";
  story.pageBackgrounds["3"] = backgroundSchema.parse({
    mode: "solid",
    colour: "#fafafa",
  });
  await page.goto("about:blank");
  await page.setContent(magazineDocument(issue));
  await page.waitForFunction(() => window.__magazineReady);
  await expect(pages).toHaveCount(4);
  await expect(pages.last()).toHaveAttribute("data-background-source", "page");
});

test("inline images insert between paragraphs, preserve original bytes, resize, crop and paginate with captions", async ({
  page,
}) => {
  const sharp = (await import("sharp")).default;
  await open(page);
  await paste(page, "<p>Before the image</p><p>After the image</p>");
  await page.getByRole("button", { name: "+ Insert", exact: true }).click();
  await page
    .getByRole("group", { name: "Insert story content" })
    .getByRole("button", { name: "Image", exact: true })
    .click();
  const image = await sharp({
    create: { width: 1600, height: 1200, channels: 3, background: "#446688" },
  })
    .jpeg()
    .toBuffer();
  await page.getByLabel("Upload inline image", { exact: true }).setInputFiles({
    name: "original.jpg",
    mimeType: "image/jpeg",
    buffer: image,
  });
  await page.getByLabel("Image caption", { exact: true }).fill("Photo caption");
  await page.getByLabel("Image height (mm)", { exact: true }).fill("90");
  await page
    .getByLabel("Inline image horizontal position", { exact: true })
    .fill("25");
  await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
  const frame = page.frameLocator("iframe");
  await expect(frame.locator(".ecu-content-image")).toHaveCount(1);
  await expect(frame.locator(".ecu-content-image figcaption")).toHaveText(
    "Photo caption",
  );
  await expect(frame.locator(".ecu-content-image img")).toHaveCSS(
    "object-position",
    "25% 50%",
  );
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await page.reload();
  await expect(frame.locator(".ecu-content-image figcaption")).toHaveText(
    "Photo caption",
  );
  const originals = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("ecu-connect:media:v1");
      request.onsuccess = () => resolve(request.result);
    });
    const items = await new Promise<Array<{ bytes: Uint8Array }>>((resolve) => {
      const request = db.transaction("assets").objectStore("assets").getAll();
      request.onsuccess = () => resolve(request.result);
    });
    db.close();
    return items.map((item) => btoa(String.fromCharCode(...item.bytes)));
  });
  expect(originals).toContain(image.toString("base64"));
});

test("Excel/Word tables and component settings persist; drag and keyboard moves retain component data", async ({
  page,
}) => {
  await open(page);
  await paste(page, "", "Heading A\tHeading B\nValue 1\tValue 2");
  const body = page.getByRole("textbox", { name: "Complete story content" });
  await expect(body.locator(".ecu-table")).toHaveCount(1);
  await body
    .getByRole("button", { name: "Select table component", exact: true })
    .click();
  await page.getByRole("button", { name: "Cell 2, 2", exact: true }).click();
  const cell = page.getByRole("textbox", { name: "Cell text", exact: true });
  await cell.fill("Updated cell");
  await page
    .getByLabel("Cell text alignment", { exact: true })
    .selectOption("right");
  await page.getByRole("button", { name: "Add row", exact: true }).click();
  await page.getByRole("button", { name: "Add column", exact: true }).click();
  await page.getByRole("button", { name: "Cell 3, 3", exact: true }).click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Remove row", exact: true }).click();
  await expect(body.locator(".ecu-table tr")).toHaveCount(3);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove row", exact: true }).click();
  await expect(body.locator(".ecu-table tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Add row", exact: true }).click();
  await page.getByRole("button", { name: "Cell 1, 3", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Remove column", exact: true })
    .click();
  await expect(
    body.locator(".ecu-table tr").first().locator("td,th"),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Add column", exact: true }).click();

  await page
    .getByRole("button", { name: "Close component settings", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Insert", exact: true }).click();
  await page
    .getByRole("group", { name: "Insert story content" })
    .getByRole("button", { name: "Quote / Testimonial", exact: true })
    .click();
  await page
    .getByLabel("Quote text", { exact: true })
    .fill("A test quotation with editable attribution.");
  await page
    .getByLabel("Person name", { exact: true })
    .fill("Sample Contributor");
  await page
    .getByLabel("Designation", { exact: true })
    .fill("Editorial fixture");
  const quoteId = await body
    .locator("[data-component-id]")
    .filter({ has: page.locator(".ecu-testimonial") })
    .getAttribute("data-component-id");
  await page
    .getByLabel("Quote preset", { exact: true })
    .selectOption("executive");
  await expect(body.locator(".ecu-quote-executive")).toContainText(
    "A test quotation",
  );
  await page
    .getByLabel("Quote preset", { exact: true })
    .selectOption("compact");
  await expect(page.getByLabel("Person name", { exact: true })).toHaveValue(
    "Sample Contributor",
  );
  await page
    .getByRole("button", { name: "Move component up", exact: true })
    .click();
  await expect(body.locator("[data-component-id]").first()).toHaveAttribute(
    "data-component-id",
    quoteId!,
  );
  await page
    .getByRole("button", { name: "Move component down", exact: true })
    .click();
  const quote = body.locator(`[data-component-id="${quoteId}"]`),
    table = body
      .locator("[data-component-id]")
      .filter({ has: page.locator(".ecu-table") });
  await page
    .getByRole("button", { name: "Close component settings", exact: true })
    .click();
  await quote.dragTo(table, { targetPosition: { x: 30, y: 3 } });
  await expect(body.locator("[data-component-id]").first()).toHaveAttribute(
    "data-component-id",
    quoteId!,
  );
  await page
    .getByRole("button", { name: "Save Magazine", exact: true })
    .click();
  await page.reload();
  await expect(body.locator("[data-component-id]").first()).toHaveAttribute(
    "data-component-id",
    quoteId!,
  );
  await expect(body.locator(".ecu-table")).toContainText("Updated cell");
  await expect(body.locator(".ecu-table tr")).toHaveCount(3);
  await expect(
    body.locator(".ecu-table tr").first().locator("td,th"),
  ).toHaveCount(3);
  await body
    .getByRole("button", { name: "Select testimonial component", exact: true })
    .click();
  await expect(page.getByLabel("Quote text", { exact: true })).toHaveValue(
    "A test quotation with editable attribution.",
  );
  await page
    .getByRole("button", { name: "Close component settings", exact: true })
    .click();
  await body.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await expect(body.locator("[data-component-id]")).toHaveCount(2);
  await expect(
    page.getByRole("status").filter({ hasText: "Components are retained" }),
  ).toBeVisible();
});

test("CTA and information boxes expose only selected settings and retain safe links and formatting", async ({
  page,
}) => {
  await open(page);
  const insert = async (name: string) => {
    await page.getByRole("button", { name: "+ Insert", exact: true }).click();
    await page
      .getByRole("group", { name: "Insert story content" })
      .getByRole("button", { name, exact: true })
      .click();
  };
  await insert("CTA Box");
  await page
    .getByLabel("Box heading", { exact: true })
    .fill("Read the editorial fixture");
  await page
    .getByRole("textbox", { name: "Box content", exact: true })
    .fill("Editable description");
  await page.getByLabel("Link label", { exact: true }).fill("Read more");
  await page
    .getByLabel("CTA link", { exact: true })
    .fill("https://example.test/editorial");
  await page
    .getByRole("button", { name: "ECU yellow preset", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Close component settings", exact: true })
    .click();
  await insert("Information Box");
  await page
    .getByLabel("Box heading", { exact: true })
    .fill("Editorial contact");
  await page
    .getByRole("textbox", { name: "Box content", exact: true })
    .fill("Contact team@example.test for this fixture.");
  await page
    .getByRole("button", { name: "Close component settings", exact: true })
    .click();
  await expect(page.locator(".story-component-settings")).toHaveCount(0);
  const frame = page.frameLocator("iframe");
  await expect(frame.locator(".ecu-cta-link")).toHaveText("Read more");
  await expect(frame.locator(".ecu-info a")).toHaveAttribute(
    "href",
    "mailto:team@example.test",
  );
  await page.screenshot({ path: "test-results/continuous-story-editor.png" });
  const fullscreen = page.getByRole("button", {
    name: "Open full-screen preview",
    exact: true,
  });
  await fullscreen.focus();
  await fullscreen.press("Enter");
  await expect(frame.locator("#pages .ecu-cta-link")).toHaveText("Read more");
  await expect(frame.locator("#pages .ecu-info a")).toHaveAttribute(
    "href",
    "mailto:team@example.test",
  );
  await page
    .getByRole("button", { name: "Close full-screen preview", exact: true })
    .press("Enter");
});

test("oversized table paste is refused before modifying the existing story", async ({
  page,
}) => {
  await open(page);
  await paste(page, "<p>Retain the existing story.</p>");
  const body = page.getByRole("textbox", { name: "Complete story content" });
  const html = await body.innerHTML();
  await paste(
    page,
    "<table><tr>" +
      Array.from(
        { length: 13 },
        (_, index) => `<td>Column ${index + 1}</td>`,
      ).join("") +
      "</tr></table>",
  );
  await expect(body).toContainText("Retain the existing story.");
  expect(await body.innerHTML()).toBe(html);
  await expect(body.locator("table")).toHaveCount(0);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Nothing was inserted or removed" }),
  ).toBeVisible();
});

test("Word numbered paragraphs retain their start, sequence and inline formatting", async ({
  page,
}) => {
  await open(page);
  await paste(
    page,
    '<p style="mso-list:l0 level1 lfo1">5. <b>Word fifth</b></p><p style="mso-list:l0 level1 lfo1">6. <u>Word sixth</u></p><p>New sequence</p><p style="mso-list:l1 level1 lfo2">1. Restart first</p><p style="mso-list:l1 level1 lfo2">2. Restart second</p>',
  );
  const body = page.getByRole("textbox", { name: "Complete story content" });
  await expect(body.locator("ol")).toHaveCount(2);
  await expect(body.locator("ol").first()).toHaveAttribute("start", "5");
  await expect(body.locator("ol").first().locator("li")).toHaveCount(2);
  await expect(body.locator("ol").first().locator("strong")).toHaveText(
    "Word fifth",
  );
  await expect(body.locator("ol").first().locator("u")).toHaveText(
    "Word sixth",
  );
  await expect(body.locator("ol").last()).toHaveAttribute("start", "1");
});
