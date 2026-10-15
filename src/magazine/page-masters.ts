import type { createMediaImage } from "./media-image";
import type { MediaReference } from "../domain/media";
import type { Issue } from "../domain/issue";
import type { PageMasterId } from "../domain/design";
import type { Theme } from "./tokens";
import type { PageKind } from "./folios";
export type PageMasterOptions = {
  kind: PageKind;
  master?: PageMasterId;
  template?: string;
  theme: Theme;
  sectionName?: string;
  issue: Issue;
  hero?: MediaReference;
  position?: "below" | "left" | "right";
  heroLayout?: "large" | "full";
  sectionNumber?: number;
  sectionStart?: boolean;
};
/** Self-contained DOM components used by the exact same document in preview/PDF.
 * Their source is serialized into the sandbox; do not add module/global dependencies.
 */
export function createPageMaster(
  options: PageMasterOptions,
  mediaImage: typeof createMediaImage,
) {
  const {
    kind,
    master = "article",
    template = "",
    theme,
    issue,
    sectionName = "",
  } = options;
  const page = document.createElement("article");
  page.className = `page master-${master} ${template}`;
  page.dataset.kind = kind;
  page.dataset.master = master;
  for (const [name, value] of Object.entries(theme))
    page.style.setProperty(`--theme-${name}`, value);
  if (options.kind === "article" && issue.furniture.topAccent) {
    const tab = document.createElement("div");
    tab.className = "top-accent";
    tab.setAttribute("aria-hidden", "true");
    page.append(tab);
  }
  if (issue.furniture.header && kind === "article") {
    const header = document.createElement("header");
    header.className = "section-header";
    header.textContent =
      (master === "opener" || master === "editorial") &&
      sectionName === "What's Up @ ECU Worldwide"
        ? "What's Up @\nECU Worldwide"
        : sectionName;
    page.append(header);
  }
  if (master === "opener") {
    page.classList.add(
      "opener",
      `opener-${options.position ?? "below"}`,
      `hero-${options.heroLayout ?? "large"}`,
    );
    page.append(
      mediaImage(
        options.hero,
        issue.renderAssets ?? [],
        "opener-photo",
        "Select a local section photograph",
      ),
    );
    const fade = document.createElement("div");
    fade.className = "opener-fade";
    page.append(fade);
    if (options.hero?.caption || options.hero?.credit) {
      const credit = document.createElement("div");
      credit.className = "photo-credit opener-photo-credit";
      credit.textContent = [options.hero.caption, options.hero.credit]
        .filter(Boolean)
        .join(" · ");
      page.append(credit);
    }
    if (options.sectionStart) {
      const ordinal = document.createElement("div");
      ordinal.className = "section-ordinal";
      ordinal.textContent = String(options.sectionNumber).padStart(2, "0");
      ordinal.setAttribute("aria-hidden", "true");
      page.append(ordinal);
    }
  }
  const body = document.createElement("div");
  body.className = "page-body";
  page.append(body);
  if (
    kind === "article" &&
    (issue.furniture.footer || issue.furniture.folios)
  ) {
    const footer = document.createElement("footer");
    footer.className = "page-footer";
    const label = document.createElement("span");
    label.className = "footer-label";
    if (issue.furniture.footer)
      label.textContent = `ECU CONNECT VOL. ${issue.volume}${issue.date ? " | " + issue.date : ""}${issue.sample ? " · SAMPLE · NOT APPROVED" : ""}`;
    const folio = document.createElement("span");
    folio.className = "page-number";
    if (!issue.furniture.folios) folio.hidden = true;
    footer.append(label, folio);
    page.append(footer);
  }
  return { page, body };
}
export function createCoverMaster(
  issue: Issue,
  mediaImage: typeof createMediaImage,
) {
  function node(tag: string, cls: string, text?: string) {
    const n = document.createElement(tag);
    n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  const page = node(
    "article",
    `page cover cover-${issue.cover?.surface ?? "white"}`,
  );
  page.dataset.kind = "cover";
  page.dataset.master = "cover";
  page.append(
    mediaImage(
      issue.cover?.image,
      issue.renderAssets ?? [],
      "cover-photo",
      "Select a local cover photograph",
    ),
  );
  page.append(node("div", "cover-fade"));
  const plaque = node("div", "cover-logo");
  plaque.append(
    mediaImage(
      issue.cover?.logo,
      issue.renderAssets ?? [],
      "logo-image",
      "Approved ECU Worldwide logo required",
    ),
  );
  page.append(plaque, node("div", "cover-brand", "ECU CONNECT"));
  if (issue.cover?.image?.caption || issue.cover?.image?.credit)
    page.append(
      node(
        "div",
        "photo-credit cover-photo-credit",
        [issue.cover.image.caption, issue.cover.image.credit]
          .filter(Boolean)
          .join(" · "),
      ),
    );
  const meta = node("div", "cover-meta");
  meta.append(
    node(
      "span",
      "edition-label",
      issue.cover?.edition ?? "FORTNIGHTLY EDITION",
    ),
    node(
      "span",
      "edition-date",
      `VOL. ${issue.volume} | ${issue.date || "DRAFT EDITION"}`,
    ),
  );
  page.append(meta);
  const text = node("div", "cover-copy");
  const title = node("h1", "cover-title", issue.cover?.headline || issue.title);
  text.append(title, node("div", "cover-rule"));
  if (issue.cover?.supportingText)
    text.append(node("p", "cover-support", issue.cover.supportingText));
  page.append(text);
  if (issue.sample)
    page.append(
      node("div", "sample-stamp", "DEMONSTRATION EDITION · NOT APPROVED"),
    );
  return { page, title, meta, text };
}
