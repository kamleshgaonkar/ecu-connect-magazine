import type { Story } from "../domain/issue";
/** Shared, self-contained badge component; explicit author colours are never contrast-adjusted. */
export function createStoryBadge(story: Story, contents = false) {
  const badge = story.badge;
  if (!badge?.enabled || !badge.text.trim()) return null;
  const node = document.createElement("span");
  node.className = contents ? "story-badge toc-badge" : "story-badge";
  node.textContent = badge.text;
  node.dataset.explicitColours = "true";
  node.style.backgroundColor = badge.background;
  node.style.color = badge.colour;
  node.style.fontSize =
    (contents ? Math.min(9, badge.fontSize) : badge.fontSize) + "pt";
  node.style.borderRadius = badge.radius + "mm";
  return node;
}
/** Called on the attached Opening Page BEFORE body pagination, after fonts are ready.
 * Geometry is measured in the same unscaled document for preview and PDF.
 */
export function applyHeadlineLayout(
  page: HTMLElement,
  story: Story,
  makeBadge: typeof createStoryBadge,
  warn: (message: string) => void,
) {
  if (!story.headlineLayout && !story.badge?.enabled) return;
  const title = page.querySelector<HTMLElement>(".story-heading .story-title");
  if (!title) {
    if (story.badge?.enabled)
      warn(
        `Story badge needs an opening headline: ${story.title || "Untitled story"}.`,
      );
    return;
  }
  const group = document.createElement("div");
  group.className = "headline-group";
  title.before(group);
  const badge = makeBadge(story);
  if (badge) group.append(badge);
  group.append(title);
  const layout = story.headlineLayout;
  if (layout) {
    if (layout.manualText !== undefined) title.textContent = layout.manualText;
    title.style.whiteSpace = "pre-wrap";
    title.style.lineHeight = String(layout.lineHeight);
    group.style.width = layout.width + "%";
    group.style.textAlign = layout.align === "centre" ? "center" : layout.align;
    group.style.marginLeft = layout.align === "left" ? "0" : "auto";
    group.style.marginRight = layout.align === "right" ? "0" : "auto";
    if (layout.fontSize !== undefined)
      title.style.fontSize = layout.fontSize + "pt";
    function lineCount() {
      const range = document.createRange();
      range.selectNodeContents(title!);
      const tops = new Set(
        Array.from(range.getClientRects())
          .filter((r) => r.height > 0)
          .map((r) => Math.round(r.top * 10) / 10),
      );
      return tops.size;
    }
    if (layout.lines !== "auto" && title.textContent) {
      const preferred =
        (parseFloat(getComputedStyle(title).fontSize) * 72) / 96;
      // Search the bounded interval; explicit breaks can make some counts impossible.
      let best: number | undefined,
        distance = Infinity;
      for (let size = 16; size <= 60; size += 0.25) {
        title.style.fontSize = size + "pt";
        if (
          lineCount() === layout.lines &&
          title.scrollWidth <= title.clientWidth + 1 &&
          Math.abs(size - preferred) < distance
        ) {
          best = size;
          distance = Math.abs(size - preferred);
        }
      }
      title.style.fontSize =
        (best ?? Math.max(16, Math.min(60, preferred))) + "pt";
      if (best === undefined)
        warn(
          `Headline cannot fit ${layout.lines} requested line(s) within 16–60 pt: ${story.title}. Text remains visible; change width, breaks or line count.`,
        );
    }
    title.dataset.headlineLines = String(lineCount());
    const body = page.querySelector<HTMLElement>(".page-body")!;
    const pageRect = page.getBoundingClientRect();
    const pxPerMm = pageRect.width / 210;
    const bodyRect = body.getBoundingClientRect();
    let target = layout.verticalMm;
    if (target === undefined && layout.placement !== "custom") {
      const design = story.pageBackgrounds?.["0"] ?? story.background;
      let imageTop: number | undefined, imageBottom: number | undefined;
      if (design?.mode === "image" && design.image) {
        imageTop =
          ((design.placement === "top"
            ? 0
            : design.placement === "bottom"
              ? 100 - design.coverage
              : (100 - design.coverage) / 2) *
            297) /
          100;
        imageBottom = imageTop + (design.coverage * 297) / 100;
      } else if (
        page.classList.contains("opener") &&
        (!design || design.mode === "default")
      ) {
        imageTop = 0;
        imageBottom = page.classList.contains("hero-full") ? 297 : 137;
      }
      if (imageTop !== undefined && imageBottom !== undefined) {
        const groupHeight = group.getBoundingClientRect().height / pxPerMm;
        const safeTop = Math.max(
          25,
          ...Array.from(
            page.querySelectorAll(
              ".section-header,.section-ordinal,.blank-section-number",
            ),
          ).map(
            (node) =>
              (node.getBoundingClientRect().bottom - pageRect.top) / pxPerMm +
              4,
          ),
        );
        // Full-bleed images have no outside space: inset the headline, preserving section furniture.
        target =
          layout.placement === "above"
            ? Math.max(safeTop, imageTop - groupHeight - 4)
            : imageBottom >= 272
              ? Math.max(
                  25,
                  268 -
                    title.closest(".story-heading")!.getBoundingClientRect()
                      .height /
                      pxPerMm -
                    16,
                )
              : imageBottom + 4;
      }
    }
    if (target !== undefined) {
      const originalTop = (bodyRect.top - pageRect.top) / pxPerMm;
      const delta =
        target - (group.getBoundingClientRect().top - pageRect.top) / pxPerMm;
      const bottom = (bodyRect.bottom - pageRect.top) / pxPerMm;
      body.style.top = originalTop + delta + "mm";
      body.style.height = Math.max(1, bottom - originalTop - delta) + "mm";
    }
  }
  const bounds = group.getBoundingClientRect(),
    pageBounds = page.getBoundingClientRect();
  const footerTop =
    page
      .querySelector(".story-author-credit,.page-footer")
      ?.getBoundingClientRect().top ?? pageBounds.bottom;
  const intersects = Array.from(
    page.querySelectorAll(
      ".section-header,.section-ordinal,.blank-section-number,.top-accent",
    ),
  ).some((node) => {
    const identity = node.getBoundingClientRect();
    return (
      bounds.left < identity.right &&
      bounds.right > identity.left &&
      bounds.top < identity.bottom &&
      bounds.bottom > identity.top
    );
  });
  if (
    page.querySelector(".page-body")!.getBoundingClientRect().top <
      pageBounds.top ||
    bounds.left < pageBounds.left ||
    bounds.right > pageBounds.right + 1 ||
    bounds.top < pageBounds.top ||
    bounds.bottom > footerTop ||
    title.scrollWidth > title.clientWidth + 1 ||
    intersects
  )
    warn(
      `Opening headline or badge overlaps page furniture or exceeds its area: ${story.title}. Text remains visible; adjust headline position, width or size.`,
    );
  if (badge && badge.scrollWidth > badge.clientWidth + 1)
    warn(
      `Story badge is too wide: ${story.title}. Shorten the badge or increase headline width.`,
    );
}
