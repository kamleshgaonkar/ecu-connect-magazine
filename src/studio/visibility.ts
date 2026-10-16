import type { Issue } from "../domain/issue";
/** Section visibility never rewrites the per-story settings it temporarily masks. */
export function toggleMagazineVisibility(
  issue: Issue,
  sectionId: string,
  storyId?: string,
): Issue {
  const section = issue.sections.find((s) => s.id === sectionId);
  if (!section || (storyId && !section.stories.some((s) => s.id === storyId)))
    return issue;
  return {
    ...issue,
    sections: issue.sections.map((s) =>
      s.id !== sectionId
        ? s
        : storyId
          ? {
              ...s,
              stories: s.stories.map((story) =>
                story.id === storyId
                  ? { ...story, enabled: !story.enabled }
                  : story,
              ),
            }
          : { ...s, enabled: !s.enabled },
    ),
  };
}
