import type { Issue } from "./issue";
import { sectionNames, issueSchema } from "./issue";
const titles = [
  "Across oceans, closer together",
  "Small moments. Shared connections.",
  "Your next issue starts here",
  "The people behind the journey",
  "A new space for new connections",
  "Care in every handover",
  "A world of celebrations",
];
const descriptions = [
  "A fictional editorial look at how a shipment connects people, places and possibilities. This demonstration story is not an ECU Worldwide announcement.",
  "An illustrative team roundup: a coffee conversation, a skills exchange and a volunteer afternoon. Names, events and activities have intentionally been left fictional.",
  "An editorial checklist for contributors. Replace these demonstration notes with verified dates, contacts and approved submissions before publication.",
  "A sample feature about the daily craft of logistics: listening carefully, asking good questions and keeping a clear record of the next step.",
  "A placeholder office profile. Add a verified location, opening date, team details and approved photography before using this template for an announcement.",
  "An illustrative reflection on thoughtful handovers. This sample is not an official statement of company policy or values.",
  "A sample calendar feature exploring how colleagues might share cultural traditions. Confirm local observance dates and regional guidance before publication.",
];
export const sampleIssue: Issue = issueSchema.parse({
  id: "volume-21-sample",
  title: "Connections that move us",
  volume: 21,
  date: "October 2026",
  sample: true,
  updatedAt: "2026-10-01T12:00:00.000Z",
  sections: sectionNames.map((name, i) => ({
    id: `section-${i}`,
    name,
    enabled: true,
    template:
      i === 0 || i === 3 ? "feature" : i === 2 ? "bulletin" : "dispatch",
    stories: [
      {
        id: `story-${i}`,
        title: titles[i],
        subtitle: descriptions[i],
        byline: "ECU Connect editorial · Demonstration copy",
        blocks: [
          { id: `intro-${i}`, type: "paragraph", text: descriptions[i] },
          {
            id: `heading-${i}`,
            type: "heading",
            text:
              i === 2 ? "Before you submit" : "Every connection has a story",
          },
          {
            id: `body-${i}`,
            type: "paragraph",
            text: "Consider the journey from the perspective of the people involved. A clear update can help a colleague plan their day; a thoughtful question can reveal an opportunity to improve. For this sample edition, we explore those ordinary moments and the connections they create. Replace this text with reviewed reporting, supporting details and the voices of your contributors.",
          },
          {
            id: `quote-${i}`,
            type: "quote",
            text: "“Good stories begin with paying attention.” — Fictional editorial note",
          },
          {
            id: `list-${i}`,
            type: "list",
            text: "Confirm the facts and attribution\nInclude a clear takeaway for readers\nReview the final pagination before export",
          },
        ],
      },
    ],
  })),
});
