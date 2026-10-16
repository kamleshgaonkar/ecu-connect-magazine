import {
  newComponent,
  newTableCell,
  componentText,
  type TableComponent,
} from "../domain/content";
import type { Block } from "../domain/issue";
import { safeLink, type RichText, type TextRun } from "../domain/content";
/** DOM allow-list importer: never preserves arbitrary pasted HTML, CSS, scripts or remote images. */
export function textRuns(element: Node): TextRun[] {
  const runs: TextRun[] = [];
  function visit(node: Node, marks: Omit<TextRun, "text"> = {}) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) runs.push({ text, ...marks });
      return;
    }
    if (!(node instanceof Element)) return;
    if (
      [
        "SCRIPT",
        "STYLE",
        "META",
        "LINK",
        "IFRAME",
        "OBJECT",
        "SVG",
        "IMG",
        "BUTTON",
      ].includes(node.tagName)
    )
      return;
    if (node.tagName === "BR") {
      runs.push({ text: "\n", ...marks });
      return;
    }
    if (
      /^(P|DIV|H[1-6]|LI)$/.test(node.tagName) &&
      runs.length &&
      !runs.at(-1)!.text.endsWith("\n")
    )
      runs.push({ text: "\n", ...marks });
    const style = node instanceof HTMLElement ? node.style : undefined;
    const next = { ...marks };
    if (
      ["B", "STRONG"].includes(node.tagName) ||
      /bold|[6-9]00/.test(style?.fontWeight ?? "")
    )
      next.bold = true;
    if (["I", "EM"].includes(node.tagName) || style?.fontStyle === "italic")
      next.italic = true;
    if (node.tagName === "U" || style?.textDecoration.includes("underline"))
      next.underline = true;
    if (node.tagName === "A") {
      const href = safeLink(node.getAttribute("href") ?? "");
      if (href) next.href = href;
    }
    node.childNodes.forEach((child) => visit(child, next));
  }
  element.childNodes.forEach((node) => visit(node));
  return runs.flatMap((run) => {
    if (run.href) return [run];
    const output: TextRun[] = [];
    let at = 0;
    for (const match of run.text.matchAll(
      /https?:\/\/[^\s<>]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    )) {
      if (match.index! > at)
        output.push({ ...run, text: run.text.slice(at, match.index) });
      const value = match[0].replace(/[.,;!?)]*$/, "");
      const href = safeLink(value);
      output.push({ ...run, text: value, ...(href ? { href } : {}) });
      at = match.index! + value.length;
    }
    if (at < run.text.length) output.push({ ...run, text: run.text.slice(at) });
    return output.length ? output : [run];
  });
}
export function richText(element: Element): RichText {
  const alignment =
    (element as HTMLElement).style.textAlign ||
    element.getAttribute("align") ||
    element.querySelector<HTMLElement>(":scope > p,:scope > div")?.style
      .textAlign;
  return {
    runs: textRuns(element),
    align: ["left", "center", "right", "justify"].includes(alignment ?? "")
      ? (alignment as RichText["align"])
      : "left",
  };
}
export function plainRich(value: RichText) {
  return value.runs.map((run) => run.text).join("");
}
export function readTable(element: Element): Block {
  const component = newComponent("table") as TableComponent;
  component.rows = Array.from(element.querySelectorAll("tr"))
    .filter((row) => row.closest("table") === element)
    .map((row) => ({
      id: crypto.randomUUID(),
      cells: Array.from(row.children)
        .filter((cell) => ["TD", "TH"].includes(cell.tagName))
        .map((cell) => ({ ...newTableCell(), content: richText(cell) })),
    }))
    .filter((row) => row.cells.length);
  if (!component.rows.length)
    component.rows = [{ id: crypto.randomUUID(), cells: [newTableCell()] }];
  const columns = Math.max(...component.rows.map((row) => row.cells.length));
  for (const row of component.rows)
    while (row.cells.length < columns) row.cells.push(newTableCell());
  component.header = !!element.querySelector("tr:first-child th");
  return {
    id: crypto.randomUUID(),
    type: "paragraph",
    text: componentText(component),
    component,
  };
}
export function readContentDOM(
  root: HTMLElement,
  existing: Block[] = [],
): Block[] {
  const blocks: Block[] = [],
    used = new Set<string>();
  function visit(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim())
        blocks.push({
          id: crypto.randomUUID(),
          type: "paragraph",
          text: node.textContent,
          rich: { runs: [{ text: node.textContent }], align: "left" },
        });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "TABLE") {
      const table = readTable(node);
      if (
        node.style.pageBreakBefore === "always" ||
        node.dataset.pageBreakBefore === "true" ||
        node.style.breakBefore === "page"
      )
        table.breakBefore = "page";
      blocks.push(table);
      return;
    }
    if (node.dataset.componentId) {
      const saved = existing.find((b) => b.id === node.dataset.componentId);
      if (saved) {
        blocks.push(saved);
        used.add(saved.id);
      }
      return;
    }
    if (
      [
        "SCRIPT",
        "STYLE",
        "META",
        "LINK",
        "IFRAME",
        "OBJECT",
        "SVG",
        "IMG",
        "BUTTON",
      ].includes(node.tagName)
    )
      return;
    if (
      [
        "P",
        "DIV",
        "H1",
        "H2",
        "H3",
        "H4",
        "H5",
        "H6",
        "BLOCKQUOTE",
        "UL",
        "OL",
      ].includes(node.tagName) &&
      !Array.from(node.children).some(
        (child) =>
          /^(P|DIV|H[1-6]|UL|OL|TABLE)$/.test(child.tagName) &&
          !["UL", "OL"].includes(node.tagName),
      )
    ) {
      const original = existing.find((b) => b.id === node.dataset.storyBlock);
      const id =
        original && !used.has(original.id) ? original.id : crypto.randomUUID();
      used.add(id);
      node.dataset.storyBlock = id;
      const rich = richText(node);
      const isList = ["UL", "OL"].includes(node.tagName);
      const items = isList
        ? Array.from(node.children)
            .filter((child) => child.tagName === "LI")
            .map(richText)
        : undefined;
      const heading = /^H[1-6]$/.test(node.tagName);
      const text = items ? items.map(plainRich).join("\n") : plainRich(rich);
      const mso = node.dataset.wordList === "true";
      const marker = mso
        ? (text.match(
            /^[ \t\u00a0]*(?:[•·▪◦‣o\uf0b7\uf0a7]|\d+[.)])[ \t\u00a0]+/,
          )?.[0] ?? "")
        : "";
      const cleaned = marker ? text.slice(marker.length) : text;
      let remainingMarker = marker.length;
      const cleanedRuns = rich.runs.flatMap((run) => {
        if (!remainingMarker) return [run];
        const removed = Math.min(remainingMarker, run.text.length);
        remainingMarker -= removed;
        return run.text.slice(removed)
          ? [{ ...run, text: run.text.slice(removed) }]
          : [];
      });
      blocks.push({
        ...(original ?? {}),
        id,
        type:
          isList || mso
            ? "list"
            : heading
              ? "heading"
              : node.tagName === "BLOCKQUOTE"
                ? "quote"
                : original?.type === "caption" || original?.type === "callout"
                  ? original.type
                  : "paragraph",
        text: cleaned,
        ...(node.style.pageBreakBefore === "always" ||
        node.dataset.pageBreakBefore === "true" ||
        node.style.breakBefore === "page"
          ? { breakBefore: "page" as const }
          : {}),
        rich: {
          ...rich,
          ...(heading ? { level: Number(node.tagName[1]) } : {}),
          ...(isList
            ? {
                ordered: node.tagName === "OL",
                ...(node.tagName === "OL"
                  ? {
                      start: Math.max(
                        1,
                        Number(node.getAttribute("start")) || 1,
                      ),
                    }
                  : {}),
                items,
              }
            : mso
              ? {
                  ordered: /^\s*\d+[.)]/.test(text),
                  ...(/^\s*\d+[.)]/.test(text)
                    ? { start: Number(text.match(/^\s*(\d+)/)![1]) || 1 }
                    : {}),
                  items: [{ runs: cleanedRuns, align: rich.align }],
                }
              : {}),
        },
      });
      return;
    }
    node.childNodes.forEach(visit);
  }
  root.childNodes.forEach(visit);
  return blocks;
}
/** Paste-only HTML whitespace normalization. Source newlines/tabs are visual
 * wrapping in normal HTML, not paragraph or soft-break markers. Never infer
 * paragraph boundaries from line length, margins or visual appearance.
 */
function normalizeClipboardHTML(root: HTMLElement) {
  function preformatted(node: Node) {
    let element = node instanceof HTMLElement ? node : node.parentElement;
    while (element && element !== root) {
      if (
        element.tagName === "PRE" ||
        /^(pre|pre-wrap|break-spaces)$/.test(element.style.whiteSpace)
      )
        return true;
      element = element.parentElement;
    }
    return false;
  }
  for (const node of root.querySelectorAll<HTMLElement>("*")) {
    delete node.dataset.wordList;
    if (
      (node.tagName.toLowerCase() === "o:p" ||
        /mso-tab-count\s*:/i.test(node.getAttribute("style") ?? "")) &&
      !node.textContent?.trim() &&
      !node.querySelector("br")
    )
      node.replaceWith(document.createTextNode(" "));
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!preformatted(node))
      node.data = node.data.replace(/[ \t\r\n\f]+/g, " ");
  }
  for (const paragraph of root.querySelectorAll<HTMLElement>(
    "p,div,h1,h2,h3,h4,h5,h6,li,td,th",
  )) {
    if (
      preformatted(paragraph) ||
      (paragraph.tagName === "DIV" &&
        paragraph.querySelector("p,div,h1,h2,h3,h4,h5,h6,ul,ol,table"))
    )
      continue;
    const contents = document.createTreeWalker(
      paragraph,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) =>
          node.nodeType === Node.TEXT_NODE ||
          (node instanceof Element && node.tagName === "BR")
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP,
      },
    );
    let previous: Text | null = null;
    let lineStart = true;
    while (contents.nextNode()) {
      const node = contents.currentNode;
      if (preformatted(node)) {
        previous = null;
        lineStart = false;
        continue;
      }
      if (node instanceof HTMLBRElement) {
        if (previous) previous.data = previous.data.replace(/ +$/, "");
        previous = null;
        lineStart = true;
        continue;
      }
      const text = node as Text;
      if (lineStart) text.data = text.data.replace(/^ +/, "");
      else if (previous?.data.endsWith(" ") && text.data.startsWith(" "))
        text.data = text.data.slice(1);
      if (text.data) {
        previous = text;
        lineStart = false;
      }
    }
    if (previous) previous.data = previous.data.replace(/ +$/, "");
    // Stale list styles/classes alone are insufficient. Require a genuine Word
    // list declaration (or an explicit marker span) AND a delimited marker.
    const declaredList = /mso-list\s*:\s*l\d+\b/i.test(
      paragraph.getAttribute("style") ?? "",
    );
    const markerSpan = Array.from(
      paragraph.querySelectorAll("span[style]"),
    ).some((span) =>
      /mso-list\s*:\s*Ignore\b/i.test(span.getAttribute("style") ?? ""),
    );
    if (
      paragraph.tagName === "P" &&
      (declaredList || markerSpan) &&
      /^[ \t\u00a0]*(?:[•·▪◦‣o\uf0b7\uf0a7]|\d+[.)])[ \t\u00a0]+/.test(
        paragraph.textContent ?? "",
      )
    )
      paragraph.dataset.wordList = "true";
  }
}
export function importWordContent(
  html: string,
  text: string,
): { blocks: Block[]; warnings: string[] } {
  const root = document.createElement("div");
  const warnings: string[] = [];
  if (html) {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    parsed
      .querySelectorAll("script,style,meta,link,iframe,object,svg")
      .forEach((node) => node.remove());
    if (parsed.querySelector("img"))
      warnings.push(
        "Pasted images are not imported from Word/remote URLs. Use + Insert → Image to upload their originals.",
      );
    if (parsed.querySelector("table table"))
      warnings.push(
        "Nested tables are flattened inside their parent cell. Review the retained text and table structure.",
      );
    if (parsed.querySelector("[rowspan],[colspan]"))
      warnings.push(
        "Merged table cells are flattened; all cell text is retained. Review the imported table structure.",
      );
    normalizeClipboardHTML(parsed.body);
    root.append(...Array.from(parsed.body.childNodes));
  } else if (text.includes("\t")) {
    const table = document.createElement("table");
    for (const line of text
      .replace(/\r\n?/g, "\n")
      .replace(/\n$/, "")
      .split("\n")) {
      const row = table.insertRow();
      for (const value of line.split("\t"))
        row.insertCell().textContent = value;
    }
    root.append(table);
  } else {
    for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
      const p = document.createElement("p");
      p.textContent = line;
      root.append(p);
    }
  }
  // Word commonly represents a manual page break as a styled BR inside a paragraph.
  for (let attempts = 0; attempts < 1000; attempts++) {
    const br = Array.from(root.querySelectorAll<HTMLBRElement>("br")).find(
      (node) =>
        node.style.pageBreakBefore === "always" ||
        node.dataset.pageBreakBefore === "true" ||
        node.style.breakBefore === "page",
    );
    if (!br) break;
    const paragraph = br.closest("p");
    if (paragraph) {
      const before = paragraph.cloneNode(false) as HTMLElement,
        after = paragraph.cloneNode(false) as HTMLElement;
      const left = document.createRange();
      left.selectNodeContents(paragraph);
      left.setEndBefore(br);
      before.append(left.cloneContents());
      const right = document.createRange();
      right.selectNodeContents(paragraph);
      right.setStartAfter(br);
      after.append(right.cloneContents());
      after.style.pageBreakBefore = "always";
      paragraph.replaceWith(before, after);
    } else {
      const marker = document.createElement("p");
      marker.style.pageBreakBefore = "always";
      br.replaceWith(marker);
    }
  }
  for (const node of root.querySelectorAll<HTMLElement>("[style]")) {
    if (
      (node.style.pageBreakBefore === "always" ||
        node.dataset.pageBreakBefore === "true" ||
        node.style.breakBefore === "page") &&
      !["P", "TABLE"].includes(node.tagName) &&
      node.firstElementChild instanceof HTMLElement
    )
      node.firstElementChild.style.pageBreakBefore = "always";
    if (
      node.style.pageBreakAfter === "always" ||
      node.style.breakAfter === "page"
    ) {
      let next = node.nextElementSibling as HTMLElement | null;
      if (!next) {
        next = document.createElement("p");
        node.after(next);
      }
      next.style.pageBreakBefore = "always";
    }
  }
  const blocks = readContentDOM(root);
  const wordListIds = new Set(
    Array.from(
      root.querySelectorAll<HTMLElement>('[data-word-list="true"]'),
    ).map((node) => node.dataset.storyBlock),
  );
  const merged: Block[] = [];
  for (const block of blocks) {
    const previous = merged.at(-1);
    if (
      previous &&
      wordListIds.has(previous.id) &&
      wordListIds.has(block.id) &&
      previous.type === "list" &&
      block.type === "list" &&
      previous.rich?.ordered === block.rich?.ordered &&
      block.breakBefore !== "page" &&
      (!block.rich?.ordered ||
        (block.rich.start ?? 1) ===
          (previous.rich?.start ?? 1) + (previous.rich?.items?.length ?? 1))
    ) {
      previous.rich = {
        ...previous.rich!,
        items: [...(previous.rich?.items ?? []), ...(block.rich?.items ?? [])],
      };
      previous.text += "\n" + block.text;
    } else merged.push(block);
  }
  return { blocks: merged, warnings };
}
