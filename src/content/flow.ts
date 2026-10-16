import type { Block } from "../domain/issue";
/** Split tables only between complete body rows; headers repeat in the remainder. Self-contained. */
export function splitContentTable(
  node: HTMLElement,
  fits: () => boolean,
): HTMLElement | null {
  const tbody = node.querySelector("tbody");
  if (!tbody) return null;
  const removed: Element[] = [];
  while (tbody.children.length > 1 && !fits()) {
    const row = tbody.lastElementChild!;
    removed.unshift(row);
    row.remove();
  }
  if (!fits() || !removed.length) {
    tbody.append(...removed);
    return null;
  }
  const remainder = node.cloneNode(true) as HTMLElement;
  remainder.querySelector("tbody")!.replaceChildren(...removed);
  return remainder;
}
/** Measured DOM flow: paragraphs preserve inline marks, components stay atomic, tables split by row. */
export function flowStoryContent(
  blocks: Block[],
  api: {
    body: () => HTMLElement;
    advance: (page?: boolean) => void;
    render: (block: Block) => HTMLElement;
    slice: (source: Node, start: number, end: number) => Node;
    warn: (message: string) => void;
    splitTable: typeof splitContentTable;
  },
) {
  const fits = () => {
    const host = api.body();
    return (
      host.scrollHeight <= host.clientHeight + 1 &&
      host.scrollWidth <= host.clientWidth + 1
    );
  };
  let attempts = 0;
  for (const [index, block] of blocks.entries()) {
    if (block.breakBefore === "page") api.advance(true);
    else if (block.breakBefore === "column" && api.body().children.length)
      api.advance();
    if (
      !block.text &&
      block.breakBefore === "page" &&
      !block.image &&
      !block.rich?.runs.length &&
      !block.component
    )
      continue;
    let node = api.render(block);
    const kind = node.dataset.componentKind;
    const atomic =
      block.type === "figure" ||
      (!!kind && kind !== "table") ||
      block.type === "heading";
    if ((block.type === "heading" || kind === "profile") && blocks[index + 1]) {
      const host = api.body(),
        probe = document.createElement("div");
      probe.append(node.cloneNode(true));
      const next = api.render(blocks[index + 1]);
      probe.append(next);
      host.append(probe);
      const actual = next.getBoundingClientRect().height,
        line = parseFloat(getComputedStyle(next).lineHeight) || 16;
      next.style.height = Math.min(actual, line * 2) + "px";
      next.style.overflow = "hidden"; // Temporary measuring probe only; actual text is never clipped.
      const keep = fits();
      probe.remove();
      if (!keep && host.children.length) api.advance();
    }
    let retried = false;
    while (true) {
      if (attempts++ > 10000) {
        api.warn(
          "Story content reached the pagination safety limit; all saved blocks are retained.",
        );
        return;
      }
      const host = api.body();
      host.append(node);
      if (fits()) break;
      if (kind === "table") {
        const remainder = api.splitTable(node, fits);
        if (remainder) {
          api.advance();
          node = remainder;
          retried = false;
          continue;
        }
      }
      node.remove();
      if (atomic || kind === "table") {
        if (!retried && host.children.length) {
          api.advance();
          retried = true;
          continue;
        }
        host.append(node);
        api.warn(
          `Story component cannot fit its available page area: ${block.id}. Reduce its height/content or choose a wider layout. It remains visible; PDF export is blocked.`,
        );
        break;
      }
      const chars = Array.from(node.textContent ?? "");
      const part = node.cloneNode(false) as HTMLElement;
      host.append(part);
      let lo = 1,
        hi = chars.length,
        best = 0;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        part.replaceChildren(...api.slice(node, 0, mid).childNodes);
        if (fits()) {
          best = mid;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      if (!best) {
        part.remove();
        if (!retried && host.children.length) {
          api.advance();
          retried = true;
          continue;
        }
        host.append(node);
        api.warn(
          `Story text cannot fit the current layout: ${block.id}. Text remains visible; PDF export is blocked.`,
        );
        break;
      }
      const boundary = chars.slice(0, best).join("").lastIndexOf(" ");
      if (boundary > best * 0.65)
        best = Array.from(
          chars
            .slice(0, best)
            .join("")
            .slice(0, boundary + 1),
        ).length;
      part.replaceChildren(...api.slice(node, 0, best).childNodes);
      const rest = node.cloneNode(false) as HTMLElement;
      rest.append(...api.slice(node, best, chars.length).childNodes);
      if (node.tagName === "OL") {
        let consumed = 0,
          completed = 0,
          partial = false;
        for (const item of Array.from(node.children)) {
          const length = Array.from(item.textContent ?? "").length;
          if (consumed + length <= best) {
            completed++;
            consumed += length;
          } else {
            partial = best > consumed;
            break;
          }
        }
        rest.setAttribute(
          "start",
          String(Number(node.getAttribute("start") ?? 1) + completed),
        );
        if (partial && rest.firstElementChild)
          (rest.firstElementChild as HTMLElement).style.listStyleType = "none";
      }
      api.advance();
      node = rest;
      retried = false;
    }
  }
}
