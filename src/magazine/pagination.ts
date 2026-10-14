import type { RenderModel } from "./templates";
import type { createPageMaster, createCoverMaster } from "./page-masters";
import type { createMediaImage } from "./media-image";
import type { printedFolio } from "./folios";
import type { PageMasterId } from "../domain/design";
export type LayoutResult = {
  pages: number;
  warnings: string[];
  notices: string[];
  storyPages: Record<string, { physicalPage: number; folio: number }>;
};
declare global {
  interface Window {
    __magazineReady?: boolean;
    __magazineResult?: LayoutResult;
  }
}
/** Browser-only measurement runner. Serialized with its dependencies, not evaluated on the server. */
export async function renderMagazine(
  model: RenderModel,
  masters: { page: typeof createPageMaster; cover: typeof createCoverMaster },
  mediaImage: typeof createMediaImage,
  folioForPage: typeof printedFolio,
  maxPages: number,
  renderId: string,
) {
  const { issue, stories } = model;
  const root = document.getElementById("pages")!;
  const warnings: string[] = [];
  const notices = [
    "Bundled SIL OFL Poppins and Bebas Neue are used. Bebas Neue substitutes for licensed Impact and Bebas Neue Bold; exact original typography is not claimed.",
  ];
  const storyPages: LayoutResult["storyPages"] = {};
  let page!: HTMLElement, body!: HTMLElement;
  let context: (typeof stories)[number] | undefined;
  const entries: { id: string; number: HTMLElement }[] = [];
  function result() {
    const r = {
      pages: root.children.length,
      warnings: [...new Set(warnings)],
      notices: [...new Set(notices)],
      storyPages,
    };
    window.__magazineResult = r;
    window.__magazineReady = true;
    parent.postMessage({ type: "magazine-ready", renderId, ...r }, "*");
  }
  window.addEventListener("message", (event) => {
    if (
      event.source === parent &&
      event.data?.type === "magazine-request" &&
      window.__magazineReady
    )
      parent.postMessage(
        { type: "magazine-ready", renderId, ...window.__magazineResult },
        "*",
      );
  });
  function el(tag: string, cls = "", text?: string) {
    const e = document.createElement(tag);
    e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function rich(tag: string, cls: string, text: string) {
    const node = el(tag, cls);
    const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
    let at = 0;
    for (const match of text.matchAll(re)) {
      node.append(document.createTextNode(text.slice(at, match.index)));
      node.append(el(match[1] ? "strong" : "em", "", match[1] || match[2]));
      at = match.index! + match[0].length;
    }
    node.append(document.createTextNode(text.slice(at)));
    return node;
  }
  function sliceStyled(source: Node, start: number, end: number) {
    let pos = 0;
    function copy(n: Node): Node {
      if (n.nodeType === 3) {
        const chars = Array.from(n.textContent!);
        const a = Math.max(0, start - pos),
          b = Math.min(chars.length, end - pos);
        pos += chars.length;
        return document.createTextNode(chars.slice(a, Math.max(a, b)).join(""));
      }
      const out = n.cloneNode(false);
      for (const c of n.childNodes) {
        const child = copy(c);
        if (child.textContent) out.appendChild(child);
      }
      return out;
    }
    return copy(source);
  }
  function make(
    kind: "contents" | "article",
    master: PageMasterId = "article",
  ) {
    if (root.children.length >= maxPages)
      throw new Error(
        `Page limit of ${maxPages} reached. Split this issue into smaller editions.`,
      );
    const built = masters.page(
      {
        kind,
        master,
        issue,
        template: kind === "article" ? context!.template : "",
        theme:
          kind === "article"
            ? context!.palette
            : {
                background: "#FFFFFF",
                ink: "#1E1E1E",
                accent: "#034EA2",
                muted: "#58595B",
              },
        sectionName: context?.sectionName,
        hero: context?.story.visual?.hero,
        position: context?.story.visual?.position,
        heroLayout: context?.story.visual?.heroLayout,
        sectionNumber: context?.sectionNumber,
        sectionStart: context?.sectionStart,
      },
      mediaImage,
    );
    root.append(built.page);
    return built;
  }
  function fresh(continued = false) {
    const master = continued
      ? context!.continuationTemplate === "opener"
        ? "article"
        : context!.continuationTemplate
      : context!.pageTemplate;
    ({ page, body } = make("article", master));
    page.dataset.storyId = context!.story.id;
    page.dataset.theme = context!.theme;
  }
  function fits() {
    return (
      body.scrollHeight <= body.clientHeight + 1 &&
      body.scrollWidth <= body.clientWidth + 1
    );
  }
  function add(node: HTMLElement) {
    body.append(node);
    if (fits()) return;
    node.remove();
    if (body.children.length) {
      fresh(true);
      body.append(node);
      if (fits()) return;
      node.remove();
    }
    const chars = Array.from(node.textContent!);
    let offset = 0;
    while (offset < chars.length) {
      let lo = 1,
        hi = chars.length - offset,
        best = 0;
      const part = node.cloneNode(false) as HTMLElement;
      body.append(part);
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        part.replaceChildren(
          ...sliceStyled(node, offset, offset + mid).childNodes,
        );
        if (fits()) {
          best = mid;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      if (!best) {
        part.remove();
        warnings.push(
          "A layout block cannot fit on an A4 page: " + context!.story.title,
        );
        body.append(node);
        page.classList.add("warning");
        return;
      }
      let end = best;
      if (offset + best < chars.length) {
        const fragment = chars.slice(offset, offset + best).join("");
        const cut = fragment.lastIndexOf(" ");
        if (cut > best * 0.65)
          end = Array.from(fragment.slice(0, cut + 1)).length;
      }
      part.replaceChildren(
        ...sliceStyled(node, offset, offset + end).childNodes,
      );
      offset += end;
      if (offset < chars.length) fresh(true);
    }
  }
  try {
    window.__magazineReady = false;
    await Promise.all([
      document.fonts.load('12px "ECU Poppins"'),
      document.fonts.load('bold 12px "ECU Poppins"'),
      document.fonts.load('140px "ECU Bebas"'),
    ]);
    await document.fonts.ready;
    const cover = masters.cover(issue, mediaImage);
    root.append(cover.page);
    // React can detach an old iframe while its async fonts/layout task is still running.
    // Measure only a visible page; a detached document reports zero-size rectangles.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    if (cover.page.getBoundingClientRect().width === 0) return;
    if (
      cover.text.scrollHeight > cover.text.clientHeight + 1 ||
      cover.text.scrollWidth > cover.text.clientWidth + 1
    )
      warnings.push(
        "Cover title or supporting text exceeds the available space. Shorten the title before export.",
      );
    for (const element of [
      cover.meta,
      ...cover.meta.querySelectorAll<HTMLElement>("span"),
      cover.page.querySelector<HTMLElement>(".cover-brand")!,
    ])
      if (
        element.scrollWidth > element.clientWidth + 1 ||
        element.scrollHeight > element.clientHeight + 1
      )
        warnings.push(
          "Cover masthead or edition ribbon exceeds its reserved space. Shorten edition details before export.",
        );
    if (!issue.cover?.image)
      notices.push(
        "No cover photograph selected; a labelled placeholder is shown.",
      );
    if (!issue.cover?.logo)
      notices.push(
        "Approved ECU Worldwide logo is missing; a labelled plaque placeholder is shown.",
      );
    let columns: HTMLElement[] = [],
      columnIndex = 0;
    let lastSection = "";
    function contentsPage(continued: boolean) {
      ({ page, body } = make("contents"));
      page.classList.add("contents");
      page.dataset.master = "contents";
      body.append(
        el("p", "toc-prefix", continued ? "Table of · continued" : "Table of"),
        el("h2", "toc-title", "CONTENTS"),
      );
      const grid = el("div", "toc-columns");
      columns = [el("div", "toc-column"), el("div", "toc-column")];
      grid.append(...columns);
      body.append(grid);
      columnIndex = 0;
      lastSection = "";
    }
    function columnFits() {
      const column = columns[columnIndex];
      return (
        column.scrollHeight <= column.clientHeight + 1 &&
        column.scrollWidth <= column.clientWidth + 1
      );
    }
    contentsPage(false);
    if (!stories.length)
      columns[0].append(
        el(
          "p",
          "text-block",
          "No stories yet. Add a section and story to begin.",
        ),
      );
    for (const item of stories) {
      const row = el("div", "toc-row");
      const label = el("div", "toc-story");
      label.append(el("span", "toc-story-title", item.story.title));
      if (item.story.visual?.summary)
        label.append(el("p", "toc-summary", item.story.visual.summary));
      if (item.story.visual?.thumbnail)
        label.append(
          mediaImage(
            item.story.visual.thumbnail,
            issue.renderAssets ?? [],
            `toc-thumbnail toc-thumbnail-${item.story.visual?.thumbnailShape ?? "landscape"}`,
            "Missing contents thumbnail",
          ),
        );
      const thumbnail = item.story.visual?.thumbnail;
      if (thumbnail?.caption || thumbnail?.credit)
        label.append(
          el(
            "p",
            "toc-media-credit",
            [thumbnail.caption, thumbnail.credit].filter(Boolean).join(" · "),
          ),
        );
      const number = el("span", "toc-number", "000");
      row.append(label, number);
      let header: HTMLElement | undefined;
      let headerNumber: HTMLElement | undefined;
      function addRow() {
        if (lastSection !== item.sectionId) {
          header = el("div", "toc-section");
          headerNumber = el("span", "toc-section-number", "000");
          header.append(
            headerNumber,
            el(
              "h3",
              "toc-section-name",
              (
                {
                  "Cover Story": "Cover\nStory",
                  "What's Up @ ECU Worldwide": "What's Up\n@ ECU Worldwide",
                  "Notice Board": "Notice\nBoard",
                  "The ECU Worldwide Way": "The ECU Worldwide\nWay",
                  "Holidays Around the World": "Holidays Around\nthe World",
                } as Record<string, string>
              )[item.sectionName] ?? item.sectionName,
            ),
          );
          columns[columnIndex].append(header);
        }
        columns[columnIndex].append(row);
      }
      addRow();
      if (!columnFits()) {
        row.remove();
        header?.remove();
        header = undefined;
        headerNumber = undefined;
        if (columnIndex === 0) {
          columnIndex = 1;
          lastSection = "";
        } else contentsPage(true);
        addRow();
        if (!columnFits())
          warnings.push("A contents entry is too tall: " + item.story.title);
      }
      if (headerNumber)
        entries.push({
          id: stories.find((t) => t.sectionId === item.sectionId)!.story.id,
          number: headerNumber,
        });
      entries.push({ id: item.story.id, number });
      lastSection = item.sectionId;
    }
    const frontMatterPages = root.children.length;
    root.children[1].setAttribute("data-contents", "primary");
    for (const item of stories) {
      context = item;
      fresh();
      const physicalPage = root.children.length;
      const folio = folioForPage(physicalPage, "article", frontMatterPages)!;
      storyPages[item.story.id] = { physicalPage, folio };
      add(el("h2", "story-title", item.story.title));
      if (item.story.subtitle) add(el("p", "subtitle", item.story.subtitle));
      if (item.story.byline) add(el("p", "byline", item.story.byline));
      if (item.pageTemplate === "opener" && !item.story.visual?.hero)
        notices.push("No section photograph selected: " + item.sectionName);
      for (const reference of item.story.media) {
        const figure = el("figure", "story-media");
        figure.append(
          mediaImage(
            reference,
            issue.renderAssets ?? [],
            "story-photo",
            "Missing story image",
          ),
        );
        if (reference.caption || reference.credit)
          figure.append(
            el(
              "figcaption",
              "",
              [reference.caption, reference.credit].filter(Boolean).join(" · "),
            ),
          );
        body.append(figure);
        if (!fits()) {
          figure.remove();
          fresh(true);
          body.append(figure);
        }
        if (!fits())
          warnings.push(
            "Story image/caption exceeds an A4 page: " + item.story.title,
          );
      }
      for (const block of item.story.blocks) {
        if (!block.text) continue;
        if (block.type === "list") {
          for (const line of block.text.split("\n"))
            add(rich("p", "text-block list-item", line));
        } else
          add(
            rich(
              block.type === "heading"
                ? "h3"
                : block.type === "quote"
                  ? "blockquote"
                  : "p",
              "text-block " + (block.type === "paragraph" ? "" : block.type),
              block.text,
            ),
          );
      }
      for (const entry of entries.filter((e) => e.id === item.story.id))
        entry.number.textContent = String(folio).padStart(2, "0");
    }
    const references = [
      issue.cover?.image,
      issue.cover?.logo,
      ...stories.flatMap(({ story }) => [
        story.visual?.hero,
        story.visual?.thumbnail,
        ...story.media,
      ]),
    ].filter((r) => Boolean(r));
    for (const reference of references) {
      if (!issue.renderAssets?.some((a) => a.asset.id === reference!.assetId))
        warnings.push(
          "Missing local image: " +
            reference!.assetId +
            ". Re-select or upload the image before export.",
        );
    }
    await Promise.all(
      [...root.querySelectorAll<HTMLImageElement>("img")].map(async (image) => {
        try {
          await image.decode();
          const asset = issue.renderAssets?.find(
            (a) => a.asset.id === image.dataset.assetId,
          )?.asset;
          if (
            asset &&
            (image.naturalWidth !== asset.width ||
              image.naturalHeight !== asset.height)
          )
            warnings.push(
              "Image dimensions do not match stored metadata: " + asset.name,
            );
          const rect = image.getBoundingClientRect();
          const minimum = 150 / 96;
          if (
            image.naturalWidth < rect.width * minimum ||
            image.naturalHeight < rect.height * minimum
          )
            notices.push(
              "Low-resolution image (below 150 dpi at placed size): " +
                (asset?.name ?? image.alt),
            );
        } catch {
          warnings.push(
            "Image cannot be decoded: " +
              image.alt +
              ". Replace it before export.",
          );
        }
      }),
    );
    [...root.children].forEach((p, i) => {
      const kind = p.getAttribute("data-kind") as
        "cover" | "contents" | "article";
      const folio = folioForPage(i + 1, kind, frontMatterPages);
      p.setAttribute("data-physical-page", String(i + 1));
      if (folio !== null) p.setAttribute("data-folio", String(folio));
      const n = p.querySelector(".page-number");
      if (n && folio !== null) n.textContent = String(folio);
      const b = p.querySelector<HTMLElement>(".page-body"),
        header = p.querySelector<HTMLElement>(".section-header"),
        footer = p.querySelector<HTMLElement>(".page-footer");
      if (
        b &&
        (b.scrollHeight > b.clientHeight + 1 ||
          b.scrollWidth > b.clientWidth + 1)
      )
        warnings.push(
          `Page ${i + 1} overflows; text remains visible. Export is blocked.`,
        );
      for (const credit of p.querySelectorAll<HTMLElement>(".photo-credit")) {
        if (
          credit.scrollWidth > credit.clientWidth + 1 ||
          (b &&
            credit.getBoundingClientRect().bottom >
              b.getBoundingClientRect().top)
        )
          warnings.push(
            `Page ${i + 1} image caption/credit overlaps narrative or exceeds its frame. Shorten it before export.`,
          );
      }
      if (
        b &&
        header &&
        header.getBoundingClientRect().bottom > b.getBoundingClientRect().top
      )
        warnings.push(
          `Page ${i + 1} header overlaps content. Shorten the section name or hide its header.`,
        );
      if (
        b &&
        footer &&
        (footer.getBoundingClientRect().top <
          b.getBoundingClientRect().bottom ||
          footer.scrollWidth > footer.clientWidth + 1)
      )
        warnings.push(
          `Page ${i + 1} footer exceeds its reserved space. Shorten edition details or hide the footer.`,
        );
    });
    result();
  } catch (error) {
    warnings.push(
      error instanceof Error ? error.message : "Pagination failed.",
    );
    result();
  }
}
