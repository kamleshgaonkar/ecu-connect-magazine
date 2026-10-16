import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { newIssue, newSection } from "../src/domain/issue";
import { backgroundSchema } from "../src/domain/background";
for (const dbVersion of [1, 2])
  test(`compact background images preserve originals and reload with existing IndexedDB v${dbVersion}`, async ({
    page,
  }) => {
    const original = await sharp({
      create: { width: 64, height: 32, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    const replacement = await sharp({
      create: { width: 64, height: 32, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
    const issue = newIssue("Local images", 22);
    issue.sections = [newSection("Cover Story"), newSection("Notice Board")];
    const story = issue.sections[0].stories[0];
    story.title = "Image Story";
    story.background = backgroundSchema.parse({
      mode: "image",
      image: {
        assetId: "legacy-id",
        alt: "Original",
        focalPoint: { x: 0.5, y: 0.5 },
      },
    });
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto("/");
    await page.evaluate(
      async ({ issue, base64, dbVersion }) => {
        localStorage.setItem("ecu-connect:issues:v1", JSON.stringify([issue]));
        const bytes = Uint8Array.from(atob(base64), (char) =>
          char.charCodeAt(0),
        );
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const r = indexedDB.open("ecu-connect:media:v1", dbVersion);
          r.onupgradeneeded = () =>
            r.result.createObjectStore("assets", { keyPath: "asset.id" });
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("assets", "readwrite");
          tx.objectStore("assets").put({
            asset: {
              id: "legacy-id",
              name: "original.png",
              mimeType: "image/png",
              width: 64,
              height: 32,
              byteLength: bytes.length,
            },
            bytes,
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      },
      { issue, base64: original.toString("base64"), dbVersion },
    );
    await page.goto("/issues/" + issue.id);
    await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
    await page
      .getByRole("button", { name: "Image Story", exact: true })
      .click();
    await page.getByRole("button", { name: "Customize", exact: true }).click();
    const panel = page.getByRole("dialog", {
      name: "Background Design settings",
    });
    await expect(panel.getByText("Change", { exact: true })).toBeVisible();
    await expect(panel.locator(".media-picker-thumb")).toHaveCSS(
      "width",
      "48px",
    );
    await expect(
      panel.getByLabel("Fade strength", { exact: true }),
    ).toBeHidden();
    const placement = await panel
      .getByLabel("Image placement", { exact: true })
      .boundingBox();
    const fade = await panel
      .getByLabel("Fade direction", { exact: true })
      .boundingBox();
    expect(Math.abs(placement!.y - fade!.y)).toBeLessThan(2);
    await panel.getByText("Advanced", { exact: true }).click();
    await expect(
      panel.getByLabel("Background image horizontal position"),
    ).toBeVisible();
    await panel.getByRole("button", { name: "Change", exact: true }).click();
    await panel
      .getByLabel("Upload background image", { exact: true })
      .setInputFiles({
        name: "original.png",
        mimeType: "image/png",
        buffer: original,
      });
    await expect(
      panel.getByRole("button", { name: "Change", exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByLabel("Upload background image", { exact: true }),
    ).toBeEnabled();
    // Replacement preserves every original binary without archive-specific deduplication.
    await panel.getByRole("button", { name: "Change", exact: true }).click();
    await panel
      .getByLabel("Upload background image", { exact: true })
      .setInputFiles({
        name: "original.png",
        mimeType: "image/png",
        buffer: replacement,
      });
    await expect(
      panel.getByRole("button", { name: "Change", exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByLabel("Upload background image", { exact: true }),
    ).toBeEnabled();
    await panel
      .getByRole("button", { name: "Close Background Design" })
      .click();
    await page
      .getByRole("textbox", { name: "Headline", exact: true })
      .fill("Renamed Story");
    await page
      .getByRole("button", { name: "Save Magazine", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Saved locally" }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-preview-ready="true"]')).toBeVisible();
    await expect(
      page
        .frameLocator("iframe")
        .locator(`[data-story-id="${story.id}"] .background-photo`),
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: /Download .*Images/ }),
    ).toHaveCount(0);
    const db = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open("ecu-connect:media:v1");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      const version = db.version;
      const rows = await new Promise<Array<{ bytes: Uint8Array }>>(
        (resolve) => {
          const r = db.transaction("assets").objectStore("assets").getAll();
          r.onsuccess = () => resolve(r.result);
        },
      );
      db.close();
      return {
        version,
        originals: rows.map((row) => btoa(String.fromCharCode(...row.bytes))),
      };
    });
    expect(db.version).toBe(dbVersion);
    expect(db.originals).toHaveLength(3);
    expect(
      db.originals.filter((bytes) => bytes === original.toString("base64")),
    ).toHaveLength(2);
    expect(db.originals).toContain(replacement.toString("base64"));
  });
