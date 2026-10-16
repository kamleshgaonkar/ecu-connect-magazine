import type { Block } from "../domain/issue";
import type { RichText } from "../domain/content";
/** Shared safe text DOM. Serialized into the renderer: no imports or module state at runtime. */
export function renderRichBlock(block: Block) {
  const rich = block.rich;
  const node = document.createElement(
    block.type === "list"
      ? rich?.ordered
        ? "ol"
        : "ul"
      : block.type === "heading"
        ? "h" + (rich?.level ?? 3)
        : block.type === "quote"
          ? "blockquote"
          : "p",
  );
  if (node.tagName === "OL" && rich?.start)
    node.setAttribute("start", String(rich.start));
  node.dataset.contentId = block.id;
  node.className =
    "text-block ecu-content-text" +
    (block.type === "heading"
      ? " heading"
      : block.type === "quote"
        ? " quote"
        : "");
  node.style.textAlign = rich?.align ?? "left";
  function inline(host: HTMLElement, text: RichText) {
    for (const run of text.runs) {
      let leaf: Node = document.createTextNode(run.text);
      for (const [mark, tag] of [
        [run.bold, "strong"],
        [run.italic, "em"],
        [run.underline, "u"],
      ] as const)
        if (mark) {
          const wrapper = document.createElement(tag);
          wrapper.append(leaf);
          leaf = wrapper;
        }
      if (run.href && /^(https?:\/\/|mailto:|tel:)/i.test(run.href)) {
        const anchor = document.createElement("a");
        anchor.href = run.href;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.append(leaf);
        leaf = anchor;
      }
      host.append(leaf);
    }
  }
  if (block.type === "list")
    for (const item of rich?.items ??
      block.text
        .split("\n")
        .map((text) => ({ runs: [{ text }], align: "left" as const }))) {
      const li = document.createElement("li");
      li.style.textAlign = item.align;
      inline(li, item);
      node.append(li);
    }
  else if (rich) inline(node, rich);
  else {
    const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
    let at = 0;
    for (const match of block.text.matchAll(re)) {
      node.append(document.createTextNode(block.text.slice(at, match.index)));
      const mark = document.createElement(match[1] ? "strong" : "em");
      mark.textContent = match[1] ?? match[2];
      node.append(mark);
      at = match.index! + match[0].length;
    }
    node.append(document.createTextNode(block.text.slice(at)));
  }
  return node;
}
