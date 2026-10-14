import type { PageMasterId, TemplateId, ThemeId } from "../domain/design";
import {
  migrateIssue,
  type IssueInput,
  type Section,
  type Story,
} from "../domain/issue";
import { visualThemes } from "./tokens";
export const templateRegistry: Record<
  TemplateId,
  { label: string; description: string; master: PageMasterId }
> = {
  opener: {
    label: "T03 · Photographic section opener",
    description:
      "Photographic hero and numbered section opening; plain article continuations.",
    master: "opener",
  },
  feature: {
    label: "Feature",
    description: "Existing large headline and pull-quote treatment.",
    master: "article",
  },
  dispatch: {
    label: "Dispatch",
    description: "Existing readable single-column update.",
    master: "article",
  },
  bulletin: {
    label: "Bulletin",
    description: "Existing separated text blocks for notices.",
    master: "article",
  },
  editorial: {
    label: "Editorial foundation",
    description:
      "Single-column article page master; full original layouts follow later.",
    master: "article",
  },
  paper: {
    label: "Paper panel foundation",
    description:
      "Inset paper page master; full transcript layouts follow later.",
    master: "paper",
  },
};
export function resolveStoryDesign(
  issueTheme: ThemeId,
  section: Section,
  story: Story,
) {
  const template =
    story.template === "inherit" ? section.template : story.template;
  const theme =
    story.theme !== "inherit"
      ? story.theme
      : section.theme !== "inherit"
        ? section.theme
        : issueTheme;
  const defaultMaster = templateRegistry[template].master;
  const pageTemplate =
    story.pageTemplate === "inherit" ? defaultMaster : story.pageTemplate;
  const continuationTemplate =
    story.continuationTemplate === "inherit"
      ? pageTemplate === "opener"
        ? "article"
        : pageTemplate
      : story.continuationTemplate;
  return {
    template,
    theme,
    pageTemplate,
    continuationTemplate,
    palette: visualThemes[theme],
  };
}
export function buildRenderModel(input: IssueInput) {
  const issue = migrateIssue(input);
  const sections = issue.sections.filter(
    (s) => s.enabled && s.stories.some((t) => t.enabled),
  );
  return {
    issue,
    stories: sections.flatMap((section) =>
      section.stories
        .filter((s) => s.enabled)
        .map((story) => ({
          sectionName: section.name,
          sectionId: section.id,
          sectionNumber: sections.indexOf(section) + 1,
          sectionStart:
            section.stories.filter((s) => s.enabled)[0].id === story.id,
          story,
          ...resolveStoryDesign(issue.theme, section, story),
        })),
    ),
  };
}
export type RenderModel = ReturnType<typeof buildRenderModel>;
