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
};
/** Self-contained DOM components used by the exact same document in preview/PDF.
 * Their source is serialized into the sandbox; do not add module/global dependencies.
 */
export function createPageMaster(options: PageMasterOptions) {
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
    header.textContent = sectionName;
    page.append(header);
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
export function createCoverMaster(issue: Issue) {
  function node(tag: string, cls: string, text?: string) {
    const n = document.createElement(tag);
    n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  const page = node("article", "page cover");
  page.dataset.kind = "cover";
  page.dataset.master = "cover";
  page.append(
    node("div", "cover-brand", "ECU CONNECT"),
    node("div", "cover-kicker", "FORTNIGHTLY EDITION"),
    node("div", "cover-mark"),
  );
  const title = node("h1", "cover-title", issue.title);
  page.append(title);
  if (issue.sample)
    page.append(
      node("div", "sample-stamp", "DEMONSTRATION EDITION · NOT APPROVED"),
    );
  const meta = node("div", "cover-meta");
  meta.append(
    node("span", "", `VOLUME ${issue.volume}`),
    node("span", "", issue.date || "DRAFT EDITION"),
  );
  page.append(meta);
  return { page, title, meta };
}
