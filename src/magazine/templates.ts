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
      ? pageTemplate
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
  return {
    issue,
    stories: issue.sections
      .filter((s) => s.enabled)
      .flatMap((section) =>
        section.stories
          .filter((s) => s.enabled)
          .map((story) => ({
            sectionName: section.name,
            story,
            ...resolveStoryDesign(issue.theme, section, story),
          })),
      ),
  };
}
export type RenderModel = ReturnType<typeof buildRenderModel>;
