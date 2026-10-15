import type { TemplateId } from "../domain/design";
export const layoutNames: Record<TemplateId, string> = {
  feature: "Feature article · classic",
  dispatch: "News article · classic",
  bulletin: "Notice · classic",
  editorial: "Simple article · classic",
  paper: "Paper panel · basic",
  opener: "Photo opener",
  t04: "Article continuation",
};
export const layoutDescriptions: Record<TemplateId, string> = {
  feature: "A headline, story text and pull quotes.",
  dispatch: "A simple layout for news and updates.",
  bulletin: "Short notes, lists and announcements.",
  editorial: "A simple single-column article.",
  paper: "A basic white panel for text.",
  opener: "An opening photo, section heading and story.",
  t04: "One or two columns with images and callouts.",
};
export type StudioLayout = {
  id: string;
  name: string;
  description: string;
  volume: number;
  page: number;
  action?: "cover" | "contents" | "opener" | "t04";
  note?: string;
};
export const studioLayouts: StudioLayout[] = [
  {
    id: "t01",
    name: "Cover",
    description: "Magazine title, edition ribbon and cover photo.",
    volume: 20,
    page: 1,
    action: "cover",
    note: "Included in every magazine. Open the cover settings to add your content.",
  },
  {
    id: "t02",
    name: "Contents",
    description: "Grouped sections, summaries and page numbers.",
    volume: 20,
    page: 2,
    action: "contents",
    note: "Included automatically. Edit story summaries and thumbnails to update it.",
  },
  {
    id: "t03",
    name: "Photo opener",
    description: "A large photo introduces a section and its first story.",
    volume: 20,
    page: 3,
    action: "opener",
    note: "Supports the photo opener and plain article continuations. Add your own approved images.",
  },
  {
    id: "t04",
    name: "Article continuation",
    description: "One or two text columns, images and callouts.",
    volume: 20,
    page: 4,
    action: "t04",
    note: "Narrative layouts are available. Mixed full-width tables, side-photo panels and bottom fades are not yet available.",
  },
  {
    id: "t05",
    name: "Paper panel",
    description: "Inset white panels for transcripts and longer stories.",
    volume: 15,
    page: 9,
  },
  {
    id: "t06",
    name: "People & announcements",
    description: "Portraits, names and organizational news.",
    volume: 20,
    page: 6,
  },
  {
    id: "t07",
    name: "Photo gallery",
    description: "Team photos and event stories in arranged rows.",
    volume: 20,
    page: 13,
  },
  {
    id: "t08",
    name: "Operations opener",
    description: "The opening page for an Operations Dashboard story.",
    volume: 20,
    page: 11,
  },
  {
    id: "t09",
    name: "Operations article",
    description: "Screenshots, benefits and supporting information.",
    volume: 20,
    page: 12,
  },
  {
    id: "t10",
    name: "Notice Board",
    description: "A notice panel over a destination photograph.",
    volume: 20,
    page: 16,
  },
  {
    id: "t11",
    name: "Notice continuation",
    description: "Additional notice text, questions and tables.",
    volume: 19,
    page: 13,
  },
  {
    id: "t12",
    name: "Leadership feature",
    description: "A media still, introduction and viewing links.",
    volume: 17,
    page: 5,
  },
  {
    id: "t13",
    name: "The ECU Worldwide Way",
    description: "The first page of the paired culture layout.",
    volume: 20,
    page: 17,
  },
  {
    id: "t14",
    name: "The Way · continuation",
    description: "The second page of the paired culture layout.",
    volume: 20,
    page: 18,
  },
  {
    id: "t15",
    name: "Holidays",
    description: "Holiday dates and countries over the beach background.",
    volume: 20,
    page: 19,
  },
  {
    id: "t16",
    name: "Holidays · continuation",
    description: "More holiday dates in the matching continuation.",
    volume: 17,
    page: 23,
  },
  {
    id: "t17",
    name: "Contributions & social",
    description: "Submission details and the social QR-code strip.",
    volume: 20,
    page: 20,
  },
];
export function friendlyPreviewMessage(message: string): string {
  if (message.startsWith("Bundled SIL"))
    return "Some original fonts are unavailable. The preview uses the fonts included with the builder.";
  if (message.startsWith("Missing local image:"))
    return "An uploaded image is missing from this browser. Select it again before exporting.";
  if (message.startsWith("No cover photograph"))
    return "Choose a cover photo to replace the placeholder.";
  if (message.startsWith("Approved ECU Worldwide logo"))
    return "Upload the approved ECU Worldwide logo for the cover.";
  if (message.startsWith("Low-resolution image"))
    return (
      "This image may look soft in print: " +
      message.slice(message.indexOf(":") + 1).trim()
    );
  if (message.includes("Editorial block cannot fit"))
    return "A block is too large for this page. Shorten it or choose a full-width continuation before exporting.";
  return message
    .replace(/T0[1-9] ?/g, "")
    .replaceAll("local image", "uploaded image")
    .replaceAll("Story image/caption", "Image or caption")
    .replaceAll("folio", "page number")
    .replaceAll("narrative", "story text");
}
