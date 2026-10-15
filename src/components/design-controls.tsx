"use client";
import type { Issue, Section, Story } from "../domain/issue";
import { themeIds, themeLabels, pageMasterIds } from "../domain/design";
import { templateRegistry } from "../magazine/templates";
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
        {inherit && <option value="inherit">Inherit parent theme</option>}
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
    <details className="mt-5 border-t border-[#e1e7e1] pt-4">
      <summary className="cursor-pointer text-xs font-semibold">
        Magazine appearance & page furniture
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ThemeSelect
          label="Issue theme"
          value={issue.theme}
          onChange={(theme) =>
            onChange({ ...issue, theme: theme as Issue["theme"] })
          }
        />
        <div className="text-xs leading-relaxed text-[#657565]">
          A4 portrait · Printed folio 1 starts after contents (PDF page 3 with
          one contents page). Cover and contents have no printed folio.
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(
          [
            ["header", "Show section headers"],
            ["footer", "Show issue/date footer"],
            ["folios", "Show printed folios"],
            ["topAccent", "Show yellow top accent"],
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
        label="Section theme"
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
    <details className="mb-5 border-b border-[#e1e7e1] pb-4">
      <summary className="cursor-pointer text-xs font-semibold">
        Story layout & appearance
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
          Story template
          <select
            value={story.template}
            onChange={(e) =>
              onChange({
                ...story,
                template: e.target.value as Story["template"],
              })
            }
          >
            <option value="inherit">Inherit section template</option>
            {Object.entries(templateRegistry).map(([id, t]) => (
              <option key={id} value={id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <ThemeSelect
          label="Story theme"
          inherit
          value={story.theme}
          onChange={(theme) =>
            onChange({ ...story, theme: theme as Story["theme"] })
          }
        />
        {(["pageTemplate", "continuationTemplate"] as const).map((key) => (
          <label key={key}>
            {key === "pageTemplate"
              ? "Opening page master"
              : "Continuation page master"}
            <select
              value={story[key]}
              onChange={(e) =>
                onChange({
                  ...story,
                  [key]: e.target.value as Story[typeof key],
                })
              }
            >
              <option value="inherit">Inherit layout</option>
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
                          ? "T04 · Editorial continuation"
                          : "T03 · Photographic opener"}
                  </option>
                ))}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label>
          T04 narrative columns
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
          Show title, standfirst and byline on T04 opening page
        </label>
        <p className="text-xs">
          T04 keeps the selected column count on continuations. Use block breaks
          to control column/page starts. Full-width tables below columns require
          a later approved table region.
        </p>
      </div>
    </details>
  );
}
