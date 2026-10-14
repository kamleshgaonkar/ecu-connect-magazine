import type { MediaReference, RenderAsset } from "../domain/media";
/** Self-contained DOM helper serialized into the shared preview/PDF document. */
export function createMediaImage(
  reference: MediaReference | undefined,
  assets: RenderAsset[],
  className: string,
  fallback: string,
) {
  const asset =
    reference && assets.find((a) => a.asset.id === reference.assetId);
  if (!asset) {
    const placeholder = document.createElement("div");
    placeholder.className = className + " media-placeholder";
    placeholder.textContent = fallback;
    placeholder.setAttribute("role", "img");
    placeholder.setAttribute("aria-label", fallback);
    return placeholder;
  }
  const image = document.createElement("img");
  image.className = className;
  image.src = asset.dataUrl;
  image.alt = reference!.alt;
  image.dataset.assetId = asset.asset.id;
  image.style.objectFit = reference!.fit ?? "cover";
  image.style.objectPosition = `${reference!.focalPoint.x * 100}% ${reference!.focalPoint.y * 100}%`;
  return image;
}
