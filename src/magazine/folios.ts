export type PageKind = "cover" | "contents" | "article";
/** Articles start at folio 1 after the cover and all measured contents pages. */
export function printedFolio(
  physicalPage: number,
  kind: PageKind,
  frontMatterPages = 2,
): number | null {
  if (!Number.isInteger(frontMatterPages) || frontMatterPages < 2)
    throw new Error(
      "Front matter requires a cover and at least one contents page.",
    );
  if (kind !== "article") return null;
  if (!Number.isInteger(physicalPage) || physicalPage <= frontMatterPages)
    throw new Error("Article folios begin after the final contents page.");
  return physicalPage - frontMatterPages;
}
