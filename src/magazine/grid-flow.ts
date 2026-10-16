import type { Story, Block } from "../domain/issue";
import type { LayoutBlock, GridRow } from "../domain/grid";
/** Serialized into the existing paginator. Uses its page masters, styled text and exact DOM measurements. */
export function flowGridStory(
  story: Story,
  api: {
    body: () => HTMLElement;
    content?: (block: Block) => HTMLElement;
    splitTable?: (node: HTMLElement, fits: () => boolean) => HTMLElement | null;
    fresh: () => void;
    rich: (tag: string, cls: string, text: string) => HTMLElement;
    slice: (node: Node, start: number, end: number) => Node;
    image: (block: Block) => HTMLElement;
    warn: (message: string) => void;
  },
) {
  const grid = story.grid!;
  const assigned = new Set(
    grid.rows.flatMap((r) => r.cells.flatMap((c) => c.contentIds)),
  );
  function content(block: Block): HTMLElement {
    if ((block.rich || block.widthPercent || block.component) && api.content)
      return api.content(block);
    if (block.type === "figure") {
      const figure = api.image(block);
      figure.dataset.contentId = block.id;
      return figure;
    }
    if (block.type === "list") {
      const list = document.createElement("div");
      list.dataset.contentId = block.id;
      block.text.split("\n").forEach((line, i) => {
        if (i) list.append(document.createTextNode("\n"));
        list.append(api.rich("p", "text-block list-item", line));
      });
      return list;
    }
    const node = api.rich(
      block.type === "heading"
        ? "h3"
        : block.type === "quote"
          ? "blockquote"
          : "p",
      "text-block " + (block.type === "paragraph" ? "" : block.type),
      block.text,
    );
    node.style.whiteSpace = "pre-wrap";
    node.dataset.contentId = block.id;
    return node;
  }
  function placement(block: LayoutBlock): HTMLElement {
    if (block.kind === "linked") {
      if (
        block.source === "author" ||
        (block.source === "headline" &&
          (story.headlineLayout || story.badge?.enabled))
      ) {
        const marker = document.createElement("span");
        marker.hidden = true; // Preserve the saved binding; its text is now final-page furniture.
        return marker;
      }
      const text =
        block.source === "headline"
          ? (story.openingFields?.title ?? story.title)
          : block.source === "introduction"
            ? (story.openingFields?.subtitle ?? story.subtitle)
            : (story.openingFields?.byline ?? story.byline);
      return api.rich(
        block.source === "headline" ? "h2" : "p",
        block.source === "headline"
          ? "story-title"
          : block.source === "introduction"
            ? "subtitle"
            : "byline",
        text,
      );
    }
    if (block.type === "figure")
      return api.image({
        id: block.id,
        type: "figure",
        text: block.text,
        image: block.image,
        figureHeightMm: Math.max(20, block.heightMm ?? 70),
      });
    if (block.type === "spacer") {
      const node = document.createElement("div");
      node.style.height = (block.heightMm ?? 10) + "mm";
      return node;
    }
    if (block.type === "divider") return document.createElement("hr");
    if (block.type === "list") {
      const node = document.createElement(block.ordered ? "ol" : "ul");
      block.text
        .split("\n")
        .forEach((line) => node.append(api.rich("li", "text-block", line)));
      return node;
    }
    return api.rich(
      block.type === "heading"
        ? "h" + (block.level ?? 2)
        : block.type === "quote"
          ? "blockquote"
          : "p",
      "text-block " + (block.type === "paragraph" ? "" : block.type),
      block.text,
    );
  }
  const pending = story.blocks
    .filter(
      (b) =>
        !assigned.has(b.id) &&
        (b.text ||
          b.type === "figure" ||
          b.component ||
          b.rich ||
          b.breakBefore === "page"),
    )
    .map((b) => ({
      node: content(b),
      type:
        b.component?.kind === "table"
          ? "table"
          : b.component
            ? "figure"
            : b.type,
      pageBreak: b.breakBefore === "page",
      columnBreak: b.breakBefore === "column",
    }));
  let consumed = 0,
    forcePage = false;
  let remainingRows: GridRow[] = [];
  function renderRow(row: GridRow, retry = false): boolean {
    if (
      (row.breakBefore || forcePage) &&
      api.body().children.length &&
      !retry
    ) {
      api.fresh();
      forcePage = false;
    }
    const body = api.body();
    const wrapper = document.createElement("div");
    wrapper.className = "magazine-grid-row";
    wrapper.dataset.gridRow = row.id;
    wrapper.style.cssText =
      "display:grid;width:100%;box-sizing:border-box;grid-template-columns:" +
      row.cells.map((c) => c.width + "fr").join(" ") +
      ";gap:" +
      row.gapMm +
      "mm;padding:" +
      row.paddingMm +
      "mm;align-items:" +
      row.align +
      ";margin:0 0 " +
      row.gapMm +
      "mm;";
    const cells = row.cells.map((cell) => {
      const element = document.createElement("div");
      element.className = "magazine-grid-cell";
      element.style.cssText =
        "min-width:0;box-sizing:border-box;display:flow-root;";
      element.dataset.gridCell = cell.id;
      for (const id of cell.contentIds) {
        const block = story.blocks.find((b) => b.id === id);
        if (block) {
          const node = content(block);
          if (block.type === "figure") {
            const image = node.querySelector<HTMLElement>(".editorial-image");
            if (image) {
              if (cell.imageHeightMm)
                image.style.height = cell.imageHeightMm + "mm";
              if (cell.imageFit) image.style.objectFit = cell.imageFit;
            }
          }
          element.append(node);
        }
      }
      for (const block of cell.blocks ?? []) {
        if (block.kind === "linked" && block.source === "article") {
          const host = document.createElement("div");
          host.dataset.linkedFlow = "true";
          host.style.display = "contents";
          element.append(host);
        } else {
          const node = placement(block);
          node.dataset.layoutBlock = block.id;
          element.append(node);
        }
      }
      wrapper.append(element);
      return element;
    });
    body.append(wrapper);
    const mm = 96 / 25.4;
    const available =
      body.getBoundingClientRect().bottom -
      wrapper.getBoundingClientRect().top -
      row.paddingMm * mm * 2 -
      row.gapMm * mm;
    const intrinsic = Math.max(
      0,
      ...cells.map((c) => c.getBoundingClientRect().height),
    );
    let limit =
      row.heightMode === "fixed"
        ? (row.heightMm - row.paddingMm * 2) * mm
        : Math.min(
            available,
            Math.max(
              row.heightMode === "min"
                ? Math.max(0, row.heightMm - row.paddingMm * 2) * mm
                : 0,
              intrinsic ||
                available /
                  Math.max(
                    1,
                    1 +
                      remainingRows.filter((r) => r.cells.some((c) => c.flow))
                        .length,
                  ),
            ),
          );
    if (
      row.heightMode === "auto" &&
      row.cells.some((c) =>
        c.blocks?.some((b) => b.kind === "linked" && b.source === "article"),
      )
    ) {
      limit = Math.min(
        available,
        Math.max(
          intrinsic,
          available /
            Math.max(
              1,
              1 +
                remainingRows.filter((r) => r.cells.some((c) => c.flow)).length,
            ),
        ),
      );
    }
    if (
      limit < 1 ||
      limit > available + 1 ||
      intrinsic > available + 1 ||
      available < 20
    ) {
      wrapper.remove();
      if (!retry && body.children.length) {
        api.fresh();
        return renderRow(row, true);
      }
      api.warn(
        "Grid row cannot fit on an A4 page in “" +
          story.title +
          "”. Reduce its fixed height, padding, image height or caption.",
      );
      body.append(wrapper);
      return false;
    }
    if (intrinsic > limit + 1) {
      api.warn(
        "Content exceeds a fixed grid row in “" +
          story.title +
          "”. Increase its height or use Auto.",
      );
      return false;
    }
    limit = Math.max(0, limit);
    for (let i = 0; i < row.cells.length; i++) {
      const cell = cells[i];
      if (!row.cells[i].flow || forcePage) continue;
      const flowHost =
        cell.querySelector<HTMLElement>("[data-linked-flow]") ?? cell;
      const hasRoom = () =>
        cell.scrollHeight <= limit + 1 &&
        cell.scrollWidth <= cell.clientWidth + 1;
      while (pending.length) {
        const current = pending[0];
        if (current.pageBreak) {
          current.pageBreak = false;
          if (consumed > 0 || wrapper.previousElementSibling) {
            forcePage = true;
            break;
          }
        }
        if (current.columnBreak) {
          current.columnBreak = false;
          if (consumed > 0) break;
        }
        const node = current.node;
        if (current.type === "heading" && pending[1]) {
          const probe = document.createElement("div");
          probe.append(
            node.cloneNode(true),
            api.slice(
              pending[1].node,
              0,
              Math.min(
                100,
                Array.from(pending[1].node.textContent ?? "").length,
              ),
            ),
          );
          flowHost.append(probe);
          const fitsHeading = hasRoom();
          probe.remove();
          if (!fitsHeading) break;
        }
        flowHost.append(node);
        if (hasRoom()) {
          pending.shift();
          consumed++;
          continue;
        }
        if (current.type === "table" && api.splitTable) {
          const remainder = api.splitTable(node, hasRoom);
          if (remainder) {
            current.node = remainder;
            consumed++;
            break;
          }
        }
        node.remove();
        if (
          current.type === "table" ||
          row.keepTogether ||
          current.type === "figure" ||
          current.type === "heading" ||
          current.type === "quote" ||
          current.type === "callout"
        )
          break;
        const chars = Array.from(node.textContent ?? "");
        const fragment = node.cloneNode(false) as HTMLElement;
        flowHost.append(fragment);
        let lo = 1,
          hi = chars.length,
          best = 0;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          fragment.replaceChildren(...api.slice(node, 0, mid).childNodes);
          if (hasRoom()) {
            best = mid;
            lo = mid + 1;
          } else hi = mid - 1;
        }
        if (best === 0) {
          fragment.remove();
          break;
        }
        if (best < chars.length) {
          const text = chars.slice(0, best).join("");
          const boundary = Math.max(
            text.lastIndexOf("\n"),
            text.lastIndexOf(" "),
          );
          if (boundary > best * 0.6)
            best = Array.from(text.slice(0, boundary + 1)).length;
        }
        // Avoid one-line fragments where a fresh linked container is available.
        if (
          best < chars.length &&
          fragment.getBoundingClientRect().height < 24 &&
          cell.children.length > 1
        ) {
          fragment.remove();
          break;
        }
        fragment.replaceChildren(...api.slice(node, 0, best).childNodes);
        const remainder = node.cloneNode(false) as HTMLElement;
        remainder.append(...api.slice(node, best, chars.length).childNodes);
        if (node.tagName === "OL") {
          let used = 0,
            completed = 0,
            partial = false;
          for (const item of Array.from(node.children)) {
            const length = Array.from(item.textContent ?? "").length;
            if (used + length <= best) {
              completed++;
              used += length;
            } else {
              partial = best > used;
              break;
            }
          }
          remainder.setAttribute(
            "start",
            String(Number(node.getAttribute("start") ?? 1) + completed),
          );
          if (partial && remainder.firstElementChild)
            (remainder.firstElementChild as HTMLElement).style.listStyleType =
              "none";
        }
        current.node = remainder;
        consumed++;
        break;
      }
    }
    const used = Math.max(
      intrinsic,
      ...cells.map((c) => c.getBoundingClientRect().height),
    );
    if (row.heightMode === "fixed")
      wrapper.style.minHeight = row.heightMm + "mm";
    if (row.heightMode === "min")
      wrapper.style.minHeight = Math.max(row.heightMm * mm, used) + "px";
    for (const cell of cells)
      if (cell.scrollWidth > cell.clientWidth + 1)
        api.warn(
          "Content is too wide for a grid cell in “" +
            story.title +
            "”. Widen the column or shorten the unbroken text.",
        );
    return true;
  }
  for (const [index, row] of grid.rows.entries()) {
    remainingRows = grid.rows.slice(index + 1);
    if (!renderRow(row)) return;
  }
  let attempts = 0;
  while (pending.length) {
    if (attempts++ > 200) {
      api.warn("Grid continuation reached the page limit.");
      return;
    }
    const before = consumed;
    api.fresh();
    forcePage = false;
    for (const [index, row] of grid.continuation.entries()) {
      remainingRows = grid.continuation.slice(index + 1);
      if (!renderRow({ ...row, breakBefore: false })) return;
    }
    if (consumed === before) {
      if (pending[0]) api.body().append(pending[0].node);
      api.warn(
        "Remaining content cannot fit in the continuation grid for “" +
          story.title +
          "”. Widen its text cells or reduce the image height. No content has been removed.",
      );
      return;
    }
  }
}
