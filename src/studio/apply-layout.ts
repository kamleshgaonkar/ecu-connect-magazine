import type { Issue } from "../domain/issue";
import { layoutNames } from "./layout-catalog";
export function applyStudioLayout(
  issue: Issue,
  action: string,
  storyId?: string,
) {
  const first = issue.sections.find(
    (section) =>
      section.enabled && section.stories.some((story) => story.enabled),
  );
  const firstStory = first?.stories.find((story) => story.enabled);
  if (action === "cover")
    return {
      issue,
      dirty: false,
      sectionId: first?.id,
      target: "cover-design",
      notice:
        "The cover is already included. Add your headline, photo and approved logo below.",
    };
  if (action === "contents")
    return {
      issue,
      dirty: false,
      sectionId: first?.id,
      storyId: firstStory?.id,
      target: firstStory ? "story-images-" + firstStory.id : undefined,
      notice: firstStory
        ? "Contents pages are included automatically. Update this story’s summary and thumbnail below."
        : "Contents pages are included automatically. Add stories to fill them.",
    };
  if (action !== "opener" && action !== "t04")
    return {
      issue,
      dirty: false,
      error: "This layout is not available to use yet.",
    };
  const section = issue.sections.find((item) =>
    item.stories.some((story) => story.id === storyId),
  );
  const story = section?.stories.find((item) => item.id === storyId);
  if (!section || !story)
    return {
      issue,
      dirty: false,
      error:
        "This story was not found. Choose a story from Page Templates again.",
    };
  const dirty =
    story.template !== action ||
    story.pageTemplate !== "inherit" ||
    story.continuationTemplate !== "inherit";
  const next = {
    ...issue,
    sections: issue.sections.map((item) =>
      item.id !== section.id
        ? item
        : {
            ...item,
            stories: item.stories.map((entry) =>
              entry.id !== story.id
                ? entry
                : {
                    ...entry,
                    template: action,
                    pageTemplate: "inherit" as const,
                    continuationTemplate: "inherit" as const,
                  },
            ),
          },
    ),
  };
  return {
    issue: next as Issue,
    dirty,
    sectionId: section.id,
    storyId: story.id,
    notice:
      layoutNames[action] +
      " is selected. Your text and images are unchanged." +
      (dirty ? " Save Magazine to keep this change." : "") +
      (!section.enabled || !story.enabled
        ? " Turn on this story and section to see it in the preview."
        : ""),
  };
}
