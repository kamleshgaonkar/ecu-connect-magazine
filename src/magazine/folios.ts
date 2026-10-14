export type PageKind = "cover" | "contents" | "article";
/** Two unnumbered front-matter pages. Extra contents pages follow the body. */
export function printedFolio(
  physicalPage: number,
  kind: PageKind,
): number | null {
  if (kind !== "article") return null;
  if (!Number.isInteger(physicalPage) || physicalPage < 3)
    throw new Error("Article folios begin on physical PDF page 3.");
  return physicalPage - 2;
}
