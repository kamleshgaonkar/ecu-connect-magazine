"use client";
import type { Issue, Section, Story } from "../domain/issue";
import { themeIds, themeLabels, pageMasterIds } from "../domain/design";
import { layoutNames } from "../studio/layout-catalog";
function ThemeSelect({
  value,
  onChange,
  inherit,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  inherit?: boolean;
  label: string;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {inherit && <option value="inherit">Use Default Design</option>}
        {themeIds.map((id) => (
          <option key={id} value={id}>
            {themeLabels[id]}
          </option>
        ))}
      </select>
    </label>
  );
}
export function IssueDesignControls({
  issue,
  onChange,
}: {
  issue: Issue;
  onChange: (issue: Issue) => void;
}) {
  return (
    <details className="mt-5 border-t border-[#E5E5E5] pt-4">
      <summary className="cursor-pointer text-xs font-semibold">
        Magazine Design
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ThemeSelect
          label="Magazine background"
          value={issue.theme}
          onChange={(theme) =>
            onChange({ ...issue, theme: theme as Issue["theme"] })
          }
        />
        <div className="text-xs leading-relaxed text-[#111111]">
          A4 pages. Page numbering begins after the contents. The cover and
          contents are not numbered.
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(
          [
            ["header", "Show section headers"],
            ["footer", "Show volume and date"],
            ["folios", "Show page numbers"],
            ["topAccent", "Show top accent"],
          ] as const
        ).map(([key, label]) => (
          <label className="checkbox-label" key={key}>
            <input
              type="checkbox"
              checked={issue.furniture[key]}
              onChange={(e) =>
                onChange({
                  ...issue,
                  furniture: { ...issue.furniture, [key]: e.target.checked },
                })
              }
            />
            {label}
          </label>
        ))}
      </div>
    </details>
  );
}
export function SectionDesignControls({
  section,
  onChange,
}: {
  section: Section;
  onChange: (section: Section) => void;
}) {
  return (
    <div className="mt-4">
      <ThemeSelect
        label="Background Style"
        inherit
        value={section.theme}
        onChange={(theme) =>
          onChange({ ...section, theme: theme as Section["theme"] })
        }
      />
    </div>
  );
}
export function StoryDesignControls({
  story,
  onChange,
}: {
  story: Story;
  onChange: (story: Story) => void;
}) {
  return (
    <details className="mb-5 border-b border-[#E5E5E5] pb-4">
      <summary className="cursor-pointer text-xs font-semibold">
        Story Design
      </summary>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={story.enabled}
          onChange={(e) => onChange({ ...story, enabled: e.target.checked })}
        />
        Include this story in preview and PDF
      </label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label>
          Story Layout
          <select
            value={story.template}
            onChange={(e) =>
              onChange({
                ...story,
                template: e.target.value as Story["template"],
              })
            }
          >
            <option value="inherit">Use Section Layout</option>
            {Object.entries(layoutNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <ThemeSelect
          label="Story background"
          inherit
          value={story.theme}
          onChange={(theme) =>
            onChange({ ...story, theme: theme as Story["theme"] })
          }
        />
        {(["pageTemplate", "continuationTemplate"] as const).map((key) => (
          <label key={key}>
            {key === "pageTemplate"
              ? "Opening Page Layout"
              : "Continuation Page Layout"}
            <select
              value={story[key]}
              onChange={(e) =>
                onChange({
                  ...story,
                  [key]: e.target.value as Story[typeof key],
                })
              }
            >
              <option value="inherit">Use Default Layout</option>
              {pageMasterIds
                .filter(
                  (id) => key !== "continuationTemplate" || id !== "opener",
                )
                .map((id) => (
                  <option value={id} key={id}>
                    {id === "article"
                      ? "Plain article"
                      : id === "paper"
                        ? "Inset paper panel"
                        : id === "editorial"
                          ? "Article continuation"
                          : "Photo opener"}
                  </option>
                ))}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label>
          Article Columns
          <select
            value={story.editorial?.columns ?? 1}
            onChange={(e) =>
              onChange({
                ...story,
                editorial: {
                  showTitle: story.editorial?.showTitle ?? true,
                  columns: Number(e.target.value) as 1 | 2,
                },
              })
            }
          >
            <option value={1}>One column · full-width</option>
            <option value={2}>Two columns · left then right</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={story.editorial?.showTitle ?? true}
            onChange={(e) =>
              onChange({
                ...story,
                editorial: {
                  columns: story.editorial?.columns ?? 1,
                  showTitle: e.target.checked,
                },
              })
            }
          />
          Show opening headline, introduction and author
        </label>
        <p className="text-xs">
          Your column choice continues onto the next page. Use block breaks to
          start a new column or page. Tables spanning both columns are not
          available yet.
        </p>
      </div>
    </details>
  );
}
