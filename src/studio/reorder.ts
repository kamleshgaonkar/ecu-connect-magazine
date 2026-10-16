import type { Issue } from "../domain/issue";
export type StoryDrag =
  | { kind: "section"; id: string }
  | { kind: "story"; id: string; sectionId: string };
/** Move existing records only, retaining all content, IDs, media and design settings. */
export function reorderMagazine(
  issue: Issue,
  source: StoryDrag,
  sectionId: string,
  beforeStoryId?: string,
  sectionEdge?: "before" | "after",
): Issue {
  if (source.kind === "section") {
    const from = issue.sections.findIndex((s) => s.id === source.id);
    const to = issue.sections.findIndex((s) => s.id === sectionId);
    if (from < 0 || to < 0 || from === to) return issue;
    if (sectionEdge) {
      const sections = issue.sections.filter((s) => s.id !== source.id);
      const at =
        sections.findIndex((s) => s.id === sectionId) +
        (sectionEdge === "after" ? 1 : 0);
      sections.splice(at, 0, issue.sections[from]);
      return sections.every((s, i) => s === issue.sections[i])
        ? issue
        : { ...issue, sections };
    }
    const sections = [...issue.sections];
    const [section] = sections.splice(from, 1);
    sections.splice(to, 0, section);
    return { ...issue, sections };
  }
  const origin = issue.sections.find((s) => s.id === source.sectionId);
  const target = issue.sections.find((s) => s.id === sectionId);
  const story = origin?.stories.find((s) => s.id === source.id);
  if (
    !origin ||
    !target ||
    !story ||
    beforeStoryId === story.id ||
    (origin.id !== target.id && target.stories.length >= 50)
  )
    return issue;
  if (beforeStoryId && !target.stories.some((s) => s.id === beforeStoryId))
    return issue;
  const sections = issue.sections.map((s) => ({
    ...s,
    stories: s.stories.filter((item) => item.id !== story.id),
  }));
  const destination = sections.find((s) => s.id === sectionId)!;
  const at = beforeStoryId
    ? destination.stories.findIndex((s) => s.id === beforeStoryId)
    : destination.stories.length;
  destination.stories.splice(at, 0, story);
  if (
    sections.every(
      (s, i) =>
        s.stories.length === issue.sections[i].stories.length &&
        s.stories.every((story, j) => story === issue.sections[i].stories[j]),
    )
  )
    return issue;
  return { ...issue, sections };
}
