import type { Block } from "../domain/issue";
import type { RenderAsset } from "../domain/media";
import type { createMediaImage } from "../magazine/media-image";
import type { renderRichBlock } from "./text-dom";
/** Shared content renderer factory, serialized for preview/PDF and reused by editor node views. */
export function createContentRenderer(
  text: typeof renderRichBlock,
  image: typeof createMediaImage,
  assets: RenderAsset[],
) {
  return (block: Block): HTMLElement => {
    const component = block.component;
    function element(tag: string, cls: string, value?: string) {
      const node = document.createElement(tag);
      node.className = cls;
      if (value !== undefined) node.textContent = value;
      return node;
    }
    function rich(value: import("../domain/content").RichText) {
      return text({ id: block.id, type: "paragraph", text: "", rich: value });
    }
    if (component) {
      const node = element(
        component.kind === "table" ? "div" : "aside",
        `ecu-component ecu-${component.kind}`,
      );
      node.dataset.contentId = block.id;
      node.dataset.componentKind = component.kind;
      node.style.width = (block.widthPercent ?? 100) + "%";
      if (component.kind === "table") {
        const table = document.createElement("table");
        table.style.backgroundColor = component.background;
        table.style.setProperty(
          "--table-border",
          `${component.borderWidth}pt solid ${component.borderColour}`,
        );
        const head = document.createElement("thead"),
          body = document.createElement("tbody");
        component.rows.forEach((row, index) => {
          const tr = document.createElement("tr");
          tr.dataset.tableRow = row.id;
          for (const cell of row.cells) {
            const td = document.createElement(
              index === 0 && component.header ? "th" : "td",
            );
            td.dataset.tableCell = cell.id;
            if (td.tagName === "TH") {
              td.style.backgroundColor = component.headerBackground;
              td.style.color = "#FFFFFF";
              td.setAttribute("scope", "col");
            }
            if (cell.background) td.style.backgroundColor = cell.background;
            if (cell.colour) td.style.color = cell.colour;
            td.append(rich(cell.content));
            tr.append(td);
          }
          (index === 0 && component.header ? head : body).append(tr);
        });
        if (head.childElementCount) table.append(head);
        table.append(body);
        node.append(table);
        return node;
      }
      if (component.kind === "profile") {
        node.classList.add("ecu-profile-wrap");
        node.style.width = (block.widthPercent ?? 34) + "%";
        const portrait = image(
          block.image,
          assets,
          "ecu-profile-photo",
          "Select an approved employee portrait",
        );
        portrait.style.height = (block.figureHeightMm ?? 45) + "mm";
        const plate = element("div", "ecu-profile-nameplate");
        plate.dataset.explicitColours = "true";
        plate.style.backgroundColor = component.plateColour;
        plate.append(
          element("strong", "", component.name),
          element("div", "", component.designation),
          element("div", "", component.company),
        );
        node.append(portrait, plate);
        return node;
      }
      if (component.kind === "testimonial") {
        node.classList.add(`ecu-quote-${component.preset}`);
        node.dataset.explicitColours = "true";
        const content = element("div", "ecu-quote-content");
        const mark = element("span", "ecu-quote-mark", "“");
        mark.setAttribute("aria-hidden", "true");
        const quote = element("blockquote", "ecu-quote-text", component.quote);
        const attribution = element("div", "ecu-quote-attribution");
        attribution.append(element("strong", "", component.name));
        if (component.designation)
          attribution.append(
            element(
              component.preset === "compact" ? "span" : "div",
              "",
              (component.preset === "compact" ? ", " : "") +
                component.designation,
            ),
          );
        if (component.company)
          attribution.append(element("div", "", component.company));
        content.append(mark, quote, attribution);
        const portrait = element("div", "ecu-quote-portrait");
        if (component.preset === "executive") {
          const yellow = element("span", "ecu-quote-circle yellow"),
            blue = element("span", "ecu-quote-circle blue");
          yellow.setAttribute("aria-hidden", "true");
          blue.setAttribute("aria-hidden", "true");
          portrait.append(yellow, blue);
        }
        const photo = image(
          block.image,
          assets,
          "ecu-quote-photo",
          "Select an approved quote portrait",
        );
        if (component.preset === "executive" && !block.image?.fit)
          photo.style.objectFit = "contain";
        portrait.append(photo);
        if (component.preset === "compact") node.append(portrait, content);
        else node.append(content, portrait);
        return node;
      }
      node.style.backgroundColor = component.background;
      node.style.borderRadius = component.radius + "mm";
      if (component.kind === "info") {
        node.style.border = `${component.borderWidth}pt solid ${component.borderColour}`;
        node.style.padding = component.paddingMm + "mm";
      } else {
        node.style.color = component.colour;
        node.dataset.explicitColours = "true";
      }
      if (component.heading)
        node.append(element("h3", "ecu-component-heading", component.heading));
      node.append(rich(component.content));
      if (component.kind === "cta" && component.href) {
        const link = element(
          "a",
          "ecu-cta-link",
          component.linkLabel || component.href,
        ) as HTMLAnchorElement;
        link.href = component.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        node.append(link);
      }
      return node;
    }
    if (block.type !== "figure") return text(block);
    const figure = document.createElement("figure");
    figure.className = "editorial-figure ecu-content-image";
    figure.dataset.contentId = block.id;
    figure.style.width = (block.widthPercent ?? 100) + "%";
    figure.style.marginInline = "auto";
    const photo = image(
      block.image,
      assets,
      "editorial-image",
      "Select an approved inline image",
    );
    photo.style.height = (block.figureHeightMm ?? 70) + "mm";
    photo.style.width = "100%";
    figure.append(photo);
    const caption = [block.text || block.image?.caption, block.image?.credit]
      .filter(Boolean)
      .join(" · ");
    if (caption) {
      const label = document.createElement("figcaption");
      label.textContent = caption;
      figure.append(label);
    }
    return figure;
  };
}
