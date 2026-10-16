import type { BackgroundDesign } from "../domain/background";
/** Self-contained browser compositor: colour changes only, no typography/geometry changes.
 * Samples a small background canvas, including cover crops, opacity, gradients and fades.
 */
export function applyTextContrast(
  page: HTMLElement,
  design?: BackgroundDesign,
) {
  // Photographic section identity is a transparent overlay, never a text panel.
  // Resolve the actual visible image so solid backgrounds and missing assets keep
  // their existing template/contrast behaviour.
  const ordinal = page.querySelector<HTMLElement>(
    ".section-ordinal,.blank-section-number",
  );
  const photo = page.querySelector<HTMLImageElement>(
    design?.mode === "image" ? ".background-photo" : ".opener-photo",
  );
  if (
    ordinal &&
    photo?.naturalWidth &&
    getComputedStyle(photo).visibility !== "hidden"
  ) {
    const imageBounds = photo.getBoundingClientRect();
    const numberBounds = ordinal.getBoundingClientRect();
    if (
      imageBounds.top <= numberBounds.top &&
      imageBounds.bottom >= numberBounds.bottom
    )
      page.classList.add("photographic-section-identity");
  }
  const mode = design?.contrast ?? "original";
  if (mode === "original") return;
  const treatment = design?.textTreatment ?? "backing";
  const width = 105,
    height = 149;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;
  const bounds = page.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  type Colour = [number, number, number, number];
  function rgba(value: string): Colour {
    if (value.startsWith("#"))
      return [
        parseInt(value.slice(1, 3), 16),
        parseInt(value.slice(3, 5), 16),
        parseInt(value.slice(5, 7), 16),
        1,
      ];
    const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
    return [parts[0] ?? 255, parts[1] ?? 255, parts[2] ?? 255, parts[3] ?? 1];
  }
  function blend(foreground: Colour, background: Colour): Colour {
    const alpha = foreground[3];
    return [
      foreground[0] * alpha + background[0] * (1 - alpha),
      foreground[1] * alpha + background[1] * (1 - alpha),
      foreground[2] * alpha + background[2] * (1 - alpha),
      1,
    ];
  }
  function luminance(colour: Colour) {
    return colour.slice(0, 3).reduce((sum, channel, index) => {
      const s = channel / 255;
      return (
        sum +
        (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4) *
          [0.2126, 0.7152, 0.0722][index]
      );
    }, 0);
  }
  function ratio(a: Colour, b: Colour) {
    const x = luminance(blend(a, b)),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  const fill = (colour: string) => {
    context!.fillStyle = colour;
    context!.fillRect(0, 0, width, height);
  };
  const custom = design && design.mode !== "default";
  fill(getComputedStyle(page).backgroundColor);
  if (!custom && page.classList.contains("blank-opening-split")) {
    fill("#FFF6DB");
    context.fillStyle = "#000000";
    context.fillRect(0, 0, width, (height * 148) / 297);
  }
  if (custom) {
    fill(design.colour);
    if (design.mode === "gradient") {
      const angle = (design.direction * Math.PI) / 180,
        dx = Math.sin(angle),
        dy = -Math.cos(angle);
      const length = Math.abs(width * dx) + Math.abs(height * dy);
      const gradient = context.createLinearGradient(
        width / 2 - (dx * length) / 2,
        height / 2 - (dy * length) / 2,
        width / 2 + (dx * length) / 2,
        height / 2 + (dy * length) / 2,
      );
      gradient.addColorStop(0, design.colour);
      gradient.addColorStop(1, design.gradientColour);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    }
  }
  function drawImage(image: HTMLImageElement | null) {
    if (
      !image?.complete ||
      !image.naturalWidth ||
      getComputedStyle(image).visibility === "hidden"
    )
      return;
    const rect = image.getBoundingClientRect(),
      style = getComputedStyle(image);
    const x = ((rect.left - bounds.left) / bounds.width) * width,
      y = ((rect.top - bounds.top) / bounds.height) * height;
    const w = (rect.width / bounds.width) * width,
      h = (rect.height / bounds.height) * height;
    const scale =
      style.objectFit === "contain"
        ? Math.min(w / image.naturalWidth, h / image.naturalHeight)
        : Math.max(w / image.naturalWidth, h / image.naturalHeight);
    const [px, py] = style.objectPosition
      .split(" ")
      .map((value) => parseFloat(value) / 100);
    const dw = image.naturalWidth * scale,
      dh = image.naturalHeight * scale;
    context!.save();
    context!.beginPath();
    context!.rect(x, y, w, h);
    context!.clip();
    context!.globalAlpha = Number(style.opacity);
    context!.drawImage(
      image,
      x + (w - dw) * (px ?? 0.5),
      y + (h - dh) * (py ?? 0.5),
      dw,
      dh,
    );
    context!.restore();
  }
  if (custom && design.mode === "image") {
    drawImage(page.querySelector<HTMLImageElement>(".background-photo"));
    const h = (height * design.coverage) / 100;
    const y =
      design.placement === "top"
        ? 0
        : design.placement === "bottom"
          ? height - h
          : (height - h) / 2;
    const gradient = context.createLinearGradient(
      0,
      design.fadeDirection === "down" ? y : y + h,
      0,
      design.fadeDirection === "down" ? y + h : y,
    );
    gradient.addColorStop(design.fadeStart / 100, design.fadeColour + "00");
    gradient.addColorStop(
      1,
      design.fadeColour +
        Math.round(design.fadeStrength * 2.55)
          .toString(16)
          .padStart(2, "0"),
    );
    context.fillStyle = gradient;
    context.fillRect(0, y, width, h);
  } else if (!custom) {
    drawImage(page.querySelector<HTMLImageElement>(".opener-photo"));
    const fade = page.querySelector<HTMLElement>(".opener-fade");
    if (
      fade &&
      getComputedStyle(fade).display !== "none" &&
      getComputedStyle(fade).visibility !== "hidden"
    ) {
      const rect = fade.getBoundingClientRect(),
        y = ((rect.top - bounds.top) / bounds.height) * height,
        h = (rect.height / bounds.height) * height;
      const colour =
        getComputedStyle(page).getPropertyValue("--theme-background").trim() ||
        "#FFFFFF";
      const gradient = context.createLinearGradient(0, y, 0, y + h);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(1, colour);
      context.fillStyle = gradient;
      context.fillRect(0, y, width, h);
    }
  }
  const pixels = context.getImageData(0, 0, width, height).data;
  const targets = page.querySelectorAll<HTMLElement>(
    ".ecu-component-heading,.story-title,.subtitle,.text-block,.heading,.quote,.list-item,.section-header,.blank-section-number,.section-ordinal,.story-author-credit,.footer-label,.page-number,.continuation,.photo-credit,.editorial-figure figcaption,.story-media figcaption,.magazine-grid-cell h1,.magazine-grid-cell h2,.magazine-grid-cell h3,.magazine-grid-cell h4,.magazine-grid-cell h5,.magazine-grid-cell h6,.magazine-grid-cell li",
  );
  for (const element of targets) {
    if (
      !element.textContent?.trim() ||
      element.hidden ||
      element.closest("[data-explicit-colours]") ||
      (page.classList.contains("photographic-section-identity") &&
        element.matches(
          ".section-ordinal,.blank-section-number,.section-header",
        ))
    )
      continue;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const surfaces: Colour[] = [];
    let ancestor: HTMLElement | null = element;
    while (ancestor && ancestor !== page) {
      const colour = rgba(getComputedStyle(ancestor).backgroundColor);
      if (colour[3] > 0) surfaces.unshift(colour);
      ancestor = ancestor.parentElement;
    }
    const samples: Colour[] = [];
    for (const fy of [0.15, 0.5, 0.85])
      for (const fx of [0.1, 0.35, 0.65, 0.9]) {
        const x = Math.max(
          0,
          Math.min(
            width - 1,
            Math.floor(
              ((rect.left - bounds.left + rect.width * fx) / bounds.width) *
                width,
            ),
          ),
        );
        const y = Math.max(
          0,
          Math.min(
            height - 1,
            Math.floor(
              ((rect.top - bounds.top + rect.height * fy) / bounds.height) *
                height,
            ),
          ),
        );
        const offset = (y * width + x) * 4;
        let sample: Colour = [
          pixels[offset],
          pixels[offset + 1],
          pixels[offset + 2],
          1,
        ];
        for (const surface of surfaces) sample = blend(surface, sample);
        samples.push(sample);
      }
    const original = rgba(getComputedStyle(element).color);
    const minimum = (colour: Colour) =>
      Math.min(...samples.map((sample) => ratio(colour, sample)));
    if (mode === "auto" && minimum(original) >= 4.5) {
      element.dataset.contrast = "original";
      continue;
    }
    const dark: Colour = [30, 30, 30, 1],
      light: Colour = [255, 255, 255, 1];
    const useLight =
        mode === "light" || (mode === "auto" && minimum(light) > minimum(dark)),
      chosen = useLight ? light : dark;
    element.style.color = useLight ? "#FFFFFF" : "#1E1E1E";
    element.dataset.contrast = useLight ? "light" : "dark";
    if (minimum(chosen) < 4.5 && treatment === "shadow") {
      element.style.textShadow = useLight
        ? "0 1px 2px #000,0 0 3px #000"
        : "0 1px 2px #fff,0 0 3px #fff";
      element.dataset.contrast = useLight ? "shadow-light" : "shadow-dark";
    }
    if (minimum(chosen) < 4.5 && treatment === "backing") {
      // Busy images can defeat either colour. A local translucent backing changes no layout metrics.
      element.style.backgroundColor = useLight
        ? "rgba(0,0,0,.88)"
        : "rgba(255,255,255,.94)";
      element.dataset.contrast = useLight ? "backed-light" : "backed-dark";
    }
  }
  // Preserve the brand accent unless its local graphic contrast is insufficient.
  function accentColour(rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  }) {
    const samples: Colour[] = [];
    for (const fraction of [0.1, 0.35, 0.65, 0.9]) {
      const x = Math.max(
        0,
        Math.min(
          width - 1,
          Math.floor(
            ((rect.left - bounds.left + rect.width * fraction) / bounds.width) *
              width,
          ),
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          height - 1,
          Math.floor(
            ((rect.top - bounds.top + rect.height / 2) / bounds.height) *
              height,
          ),
        ),
      );
      const i = (y * width + x) * 4;
      samples.push([pixels[i], pixels[i + 1], pixels[i + 2], 1]);
    }
    const score = (colour: string) =>
      Math.min(...samples.map((sample) => ratio(rgba(colour), sample)));
    if (score("#FFDD00") >= 3) return "#FFDD00";
    const candidates = ["#034EA2", "#1E1E1E", "#FFFFFF"];
    return candidates.reduce((best, colour) =>
      score(colour) > score(best) ? colour : best,
    );
  }
  const accent = page.querySelector<HTMLElement>(".top-accent");
  if (accent)
    accent.style.backgroundColor = accentColour(accent.getBoundingClientRect());
  const footerLabel = page.querySelector<HTMLElement>(".footer-label");
  if (footerLabel?.textContent) {
    const rect = footerLabel.getBoundingClientRect();
    footerLabel.style.setProperty(
      "--folio-accent",
      accentColour({
        left: rect.left - (bounds.width * 15) / 210,
        top: rect.top + rect.height / 2,
        width: (bounds.width * 12.55) / 210,
        height: (bounds.height * 0.5) / 297,
      }),
    );
  }
}
