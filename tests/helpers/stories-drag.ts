import type { Locator, Page } from "@playwright/test";
/** Exercise the handle's real pointer capture rather than browser HTML5 draggable events. */
export async function dragStoryItem(
  page: Page,
  handle: Locator,
  target: Locator,
  edge: "before" | "after" = "after",
) {
  await handle.scrollIntoViewIfNeeded();
  const from = await handle.boundingBox();
  if (!from) throw Error("Drag handle is not visible");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 7, {
    steps: 2,
  });
  const to = await target.boundingBox();
  if (!to) throw Error("Drop target is not visible");
  await page.mouse.move(
    to.x + to.width / 2,
    to.y + to.height * (edge === "before" ? 0.2 : 0.8),
    { steps: 12 },
  );
  await page.mouse.up();
}
