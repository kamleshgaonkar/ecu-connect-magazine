"use client";
import type { Story } from "../domain/issue";
import {
  headlineLayoutSchema,
  storyBadgeSchema,
  type HeadlineLayout,
} from "../domain/headline";
export function HeadlineControls({
  story,
  onChange,
}: {
  story: Story;
  onChange: (story: Story) => void;
}) {
  const layout = story.headlineLayout ?? headlineLayoutSchema.parse({});
  const update = (patch: Partial<HeadlineLayout>) =>
    onChange({ ...story, headlineLayout: { ...layout, ...patch } });
  return (
    <details className="compact-story-control">
      <summary>
        Headline Layout{" "}
        <small>{story.headlineLayout ? "Customised" : "Original"}</small>
      </summary>
      <div className="compact-control-fields">
        <label>
          Headline placement
          <select
            aria-label="Headline placement"
            value={layout.placement}
            onChange={(e) =>
              update({
                placement: e.target.value as HeadlineLayout["placement"],
                verticalMm: undefined,
              })
            }
          >
            <option value="above">Above Image</option>
            <option value="below">Below Image</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label>
          Vertical position (mm)
          {/* Blank retains the template or image-relative automatic position. */}
          <input
            type="number"
            min={0}
            max={250}
            placeholder="Automatic"
            value={layout.verticalMm ?? ""}
            onChange={(e) =>
              update({
                verticalMm:
                  e.target.value === ""
                    ? undefined
                    : Math.max(0, Math.min(250, Number(e.target.value))),
              })
            }
          />
        </label>
        <label>
          Headline alignment
          <select
            aria-label="Headline alignment"
            value={layout.align}
            onChange={(e) =>
              update({ align: e.target.value as HeadlineLayout["align"] })
            }
          >
            <option value="left">Left</option>
            <option value="centre">Centre</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label>
          Headline width ({layout.width}%)
          <input
            type="range"
            min={20}
            max={100}
            value={layout.width}
            onChange={(e) => update({ width: Number(e.target.value) })}
          />
        </label>
        <label>
          Headline lines
          <select
            aria-label="Headline lines"
            value={layout.lines}
            onChange={(e) =>
              update({
                lines:
                  e.target.value === "auto"
                    ? "auto"
                    : (Number(e.target.value) as 1 | 2 | 3 | 4),
              })
            }
          >
            <option value="auto">Auto</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Headline font size (pt)
          <input
            type="number"
            min={16}
            max={60}
            step={0.25}
            placeholder="Original"
            value={layout.fontSize ?? ""}
            onChange={(e) =>
              update({
                fontSize:
                  e.target.value === ""
                    ? undefined
                    : Math.max(16, Math.min(60, Number(e.target.value))),
              })
            }
          />
        </label>
        <label>
          Headline line spacing
          <input
            type="number"
            min={1}
            max={1.8}
            step={0.05}
            value={layout.lineHeight}
            onChange={(e) =>
              update({
                lineHeight: Math.max(1, Math.min(1.8, Number(e.target.value))),
              })
            }
          />
        </label>
        <label className="control-full">
          Manual headline breaks
          <textarea
            rows={3}
            maxLength={204}
            value={
              layout.manualText ?? story.openingFields?.title ?? story.title
            }
            onChange={(e) => update({ manualText: e.target.value })}
          />
        </label>
      </div>
      <p className="muted">
        Opening Page only. Manual text is a display override; the contents index
        keeps the original Headline. Numbered lines fit within 16–60 pt;
        impossible requests show a preview warning.
      </p>
      {layout.manualText !== undefined && (
        <button
          className="text-button"
          onClick={() => update({ manualText: undefined })}
        >
          Use synced headline
        </button>
      )}
      {story.headlineLayout && (
        <button
          className="text-button"
          onClick={() => onChange({ ...story, headlineLayout: undefined })}
        >
          Reset headline layout
        </button>
      )}
    </details>
  );
}
export function StoryBadgeControls({
  story,
  onChange,
}: {
  story: Story;
  onChange: (story: Story) => void;
}) {
  const badge = story.badge ?? storyBadgeSchema.parse({});
  return (
    <details className="compact-story-control">
      <summary>
        Story Badge <small>{badge.enabled ? "Enabled" : "Off"}</small>
      </summary>
      <label className="check">
        <input
          type="checkbox"
          checked={badge.enabled}
          onChange={(e) =>
            onChange({
              ...story,
              badge: { ...badge, enabled: e.target.checked },
            })
          }
        />
        Show story badge
      </label>
      {badge.enabled && (
        <div className="compact-control-fields">
          <label className="control-full">
            Badge text
            <input
              value={badge.text}
              maxLength={80}
              onChange={(e) =>
                onChange({
                  ...story,
                  badge: { ...badge, text: e.target.value },
                })
              }
            />
          </label>
          <label>
            Badge background
            <input
              type="color"
              value={badge.background}
              onChange={(e) =>
                onChange({
                  ...story,
                  badge: { ...badge, background: e.target.value },
                })
              }
            />
          </label>
          <label>
            Badge text colour
            <input
              type="color"
              value={badge.colour}
              onChange={(e) =>
                onChange({
                  ...story,
                  badge: { ...badge, colour: e.target.value },
                })
              }
            />
          </label>
          <label>
            Badge font size (pt)
            <input
              type="number"
              min={7}
              max={18}
              value={badge.fontSize}
              onChange={(e) =>
                onChange({
                  ...story,
                  badge: {
                    ...badge,
                    fontSize: Math.max(7, Math.min(18, Number(e.target.value))),
                  },
                })
              }
            />
          </label>
          <label>
            Badge corner radius (mm)
            <input
              type="number"
              min={0}
              max={12}
              value={badge.radius}
              onChange={(e) =>
                onChange({
                  ...story,
                  badge: {
                    ...badge,
                    radius: Math.max(0, Math.min(12, Number(e.target.value))),
                  },
                })
              }
            />
          </label>
        </div>
      )}
    </details>
  );
}
