import type { RenderModel } from "./templates";
import type { createPageMaster, createCoverMaster } from "./page-masters";
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
  folioForPage: typeof printedFolio,
  maxPages: number,
  renderId: string,
) {
  const { issue, stories } = model;
  const root = document.getElementById("pages")!;
  const warnings: string[] = [];
  const notices = [
    "Original Poppins, Impact and Bebas font files are not bundled. System font fallbacks are used; exact typography is deferred.",
  ];
  const storyPages: LayoutResult["storyPages"] = {};
  let page: HTMLElement, body: HTMLElement;
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
    const built = masters.page({
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
    });
    root.append(built.page);
    return built;
  }
  function fresh(continued = false) {
    const master = continued
      ? context!.continuationTemplate
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
    await document.fonts.ready;
    const cover = masters.cover(issue);
    root.append(cover.page);
    // React can detach an old iframe while its async fonts/layout task is still running.
    // Measure only a visible page; a detached document reports zero-size rectangles.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    if (cover.page.getBoundingClientRect().width === 0) return;
    if (
      (
        cover.page.querySelector(".sample-stamp") || cover.title
      ).getBoundingClientRect().bottom >
      cover.meta.getBoundingClientRect().top - 20
    )
      warnings.push(
        "Cover title exceeds the available space. Shorten the title before export.",
      );
    ({ page, body } = make("contents"));
    const firstContents = page;
    body.append(el("h2", "toc-title", "In this issue"));
    // Measure all contents pages before assigning article folios.
    body.append(
      el(
        "p",
        "toc-note",
        "Page references are printed article folios. Numbering starts after the contents.",
      ),
    );
    if (!stories.length)
      body.append(
        el(
          "p",
          "text-block",
          "No stories yet. Add a section and story to begin.",
        ),
      );
    for (const { sectionName, story } of stories) {
      const row = el("div", "toc-row");
      const label = el("div");
      label.append(el("small", "", sectionName), el("span", "", story.title));
      const number = el("span", "toc-number", "000");
      row.append(label, number);
      body.append(row);
      if (!fits()) {
        row.remove();
        ({ page, body } = make("contents"));
        body.append(el("h2", "toc-title", "Contents · continued"));
        body.append(row);
        if (!fits())
          warnings.push("A contents entry is too tall: " + story.title);
      }
      entries.push({ id: story.id, number });
    }
    const frontMatterPages = root.children.length;
    firstContents.dataset.contents = "primary";
    for (const item of stories) {
      context = item;
      fresh();
      const physicalPage = root.children.length;
      const folio = folioForPage(physicalPage, "article", frontMatterPages)!;
      storyPages[item.story.id] = { physicalPage, folio };
      add(el("h2", "story-title", item.story.title));
      if (item.story.subtitle) add(el("p", "subtitle", item.story.subtitle));
      if (item.story.byline) add(el("p", "byline", item.story.byline));
      if (item.story.media.length)
        warnings.push(
          `Media placement is not implemented in Phase 3A: ${item.story.title}. Attached media cannot be silently omitted from a PDF.`,
        );
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
      entries.find((e) => e.id === item.story.id)!.number.textContent = String(
        folio,
      ).padStart(2, "0");
    }
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
