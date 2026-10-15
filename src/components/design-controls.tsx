"use client";
import type { Block, Issue, Section, Story } from "../domain/issue";
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
    <details className="disclosure">
      <summary>Magazine Design</summary>
      <div className="disclosure-body grid gap-4 sm:grid-cols-2">
        <ThemeSelect
          label="Magazine background"
          value={issue.theme}
          onChange={(theme) =>
            onChange({ ...issue, theme: theme as Issue["theme"] })
          }
        />
        <p className="helper">
          A4 pages. Page numbering begins after the contents. The cover and
          contents are not numbered.
        </p>
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
    <ThemeSelect
      label="Background Style"
      inherit
      value={section.theme}
      onChange={(theme) =>
        onChange({ ...section, theme: theme as Section["theme"] })
      }
    />
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
    <details className="disclosure">
      <summary>Story Design</summary>
      <div className="disclosure-body grid gap-4 sm:grid-cols-2">
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
      </div>
    </details>
  );
}
export function StoryAdvancedLayout({
  story,
  onChange,
}: {
  story: Story;
  onChange: (story: Story) => void;
}) {
  return (
    <details className="disclosure">
      <summary>Advanced Layout</summary>
      <div className="disclosure-body grid gap-4 sm:grid-cols-2">
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
      </div>
      <p className="helper">
        Your column choice continues onto the next page. Use block breaks to
        start a new column or page. Tables spanning both columns are not
        available yet.
      </p>
      {story.blocks.length > 0 && (
        <div className="block-breaks">
          <h4>Content block breaks</h4>
          {story.blocks.map((block, i) => (
            <div className="block-break" key={block.id}>
              <label htmlFor={"break-" + block.id}>
                Block {i + 1} break before
              </label>
              <span className="helper" id={"break-hint-" + block.id}>
                {block.type === "figure"
                  ? "Image"
                  : block.text.trim().slice(0, 60) || "Empty block"}
              </span>
              <select
                id={"break-" + block.id}
                aria-describedby={"break-hint-" + block.id}
                value={block.breakBefore ?? "auto"}
                onChange={(e) =>
                  onChange({
                    ...story,
                    blocks: story.blocks.map((b) =>
                      b.id === block.id
                        ? {
                            ...b,
                            breakBefore: e.target
                              .value as Block["breakBefore"],
                          }
                        : b,
                    ),
                  })
                }
              >
                <option value="auto">Automatic</option>
                <option value="column">Next column</option>
                <option value="page">Next page</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
