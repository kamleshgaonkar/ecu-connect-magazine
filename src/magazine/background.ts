import type { BackgroundDesign } from "../domain/background";
import type { createMediaImage } from "./media-image";
import type { RenderAsset } from "../domain/media";
/** Self-contained, serialized into the same document for preview and Chromium PDF. */
export function applyPageBackground(
  page: HTMLElement,
  design: BackgroundDesign | undefined,
  assets: RenderAsset[],
  mediaImage: typeof createMediaImage,
) {
  if (!design || design.mode === "default") return;
  page.classList.add("custom-background");
  const layer = document.createElement("div");
  layer.className = "page-background";
  layer.setAttribute("aria-hidden", "true");
  layer.style.background =
    design.mode === "gradient"
      ? `linear-gradient(${design.direction}deg, ${design.colour}, ${design.gradientColour})`
      : design.colour;
  if (design.mode === "image" && design.image) {
    const frame = document.createElement("div");
    frame.className = "page-background-image";
    frame.style.height = `${design.coverage}%`;
    frame.style.top =
      design.placement === "top"
        ? "0"
        : design.placement === "bottom"
          ? `${100 - design.coverage}%`
          : `${(100 - design.coverage) / 2}%`;
    const image = mediaImage(
      design.image,
      assets,
      "background-photo",
      "Background image unavailable",
    );
    image.style.opacity = String(design.opacity / 100);
    const fade = document.createElement("div");
    fade.className = "background-fade";
    const rgb = [1, 3, 5]
      .map((offset) =>
        parseInt(design.fadeColour.slice(offset, offset + 2), 16),
      )
      .join(",");
    fade.style.background = `linear-gradient(to ${design.fadeDirection === "down" ? "bottom" : "top"}, rgba(${rgb},0) ${design.fadeStart}%, rgba(${rgb},${design.fadeStrength / 100}) 100%)`;
    frame.append(image, fade);
    layer.append(frame);
  }
  page.prepend(layer);
}
