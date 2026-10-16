import type { IssueInput } from "../domain/issue";
import { buildRenderModel } from "./templates";
import { createPageMaster, createCoverMaster } from "./page-masters";
import { printedFolio } from "./folios";
import { applyHeadlineLayout, createStoryBadge } from "./headline";
import { applyTextContrast } from "./contrast";
import { applyPageBackground } from "./background";
import { flowGridStory } from "./grid-flow";
import { renderMagazine } from "./pagination";
import { designTokens } from "./tokens";
import { magazineFontStyles } from "./fonts";
import { createMediaImage } from "./media-image";
import { magazineStyles } from "./styles";
export { magazineStyles } from "./styles";
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
function serialize(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
/** Preview and export render the same typed page components and measured runner.
 * Only self-contained functions are serialized; no user content becomes script.
 */
export function magazineDocument(
  input: IssueInput,
  renderId = crypto.randomUUID(),
): string {
  const model = buildRenderModel(input);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ECU Connect · Volume ${model.issue.volume}</title><style>${magazineFontStyles}${magazineStyles}</style></head><body><div class="pages" id="pages"></div><script>
 const model=${serialize(model)};
 const mediaImage=${createMediaImage.toString()};
 const masters={page:${createPageMaster.toString()},cover:${createCoverMaster.toString()}};
 const folioForPage=${printedFolio.toString()};
 (${renderMagazine.toString()})(model,masters,mediaImage,folioForPage,${designTokens.page.maxPages},${serialize(renderId)},${applyPageBackground.toString()},${applyTextContrast.toString()},${applyHeadlineLayout.toString()},${createStoryBadge.toString()}${model.stories.some((item) => item.story.grid) ? "," + flowGridStory.toString() : ""});
 </script></body></html>`;
}
