"use client";
import type { Issue, Story } from "../domain/issue";
import { MediaPicker } from "./media-picker";
export function CoverControls({
  issue,
  onChange,
}: {
  issue: Issue;
  onChange: (issue: Issue) => void;
}) {
  const cover = issue.cover ?? {
    headline: "",
    supportingText: "",
    edition: "FORTNIGHTLY EDITION",
    surface: "white" as const,
  };
  function change(next: typeof cover) {
    onChange({ ...issue, cover: next });
  }
  return (
    <details className="mt-5 border-t border-[#e1e7e1] pt-4">
      <summary className="cursor-pointer text-xs font-semibold">
        T01 · Cover design & local images
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label>
          Cover headline
          <input
            value={cover.headline}
            placeholder="Use issue title"
            maxLength={200}
            onChange={(e) => change({ ...cover, headline: e.target.value })}
          />
        </label>
        <label>
          Cover edition ribbon
          <input
            value={cover.edition}
            maxLength={50}
            onChange={(e) => change({ ...cover, edition: e.target.value })}
          />
        </label>
        <label>
          Cover supporting text
          <textarea
            rows={2}
            value={cover.supportingText}
            maxLength={500}
            onChange={(e) =>
              change({ ...cover, supportingText: e.target.value })
            }
          />
        </label>
        <label>
          Cover surface
          <select
            value={cover.surface}
            onChange={(e) =>
              change({
                ...cover,
                surface: e.target.value as typeof cover.surface,
              })
            }
          >
            <option value="white">White · Volume 20</option>
            <option value="sky">Sky · Volumes 15 / 19</option>
            <option value="blue">White to blue · Volume 17</option>
          </select>
        </label>
      </div>
      <MediaPicker
        label="Cover photograph"
        value={cover.image}
        onChange={(image) => change({ ...cover, image })}
      />
      <MediaPicker
        label="Official logo"
        value={cover.logo}
        onChange={(logo) => change({ ...cover, logo })}
      />
    </details>
  );
}
export function StoryVisualControls({
  story,
  onChange,
}: {
  story: Story;
  onChange: (story: Story) => void;
}) {
  const visual = story.visual ?? {
    summary: "",
    position: "below" as const,
    heroLayout: "large" as const,
  };
  function change(next: typeof visual) {
    onChange({ ...story, visual: next });
  }
  return (
    <details className="mb-5 border-b border-[#e1e7e1] pb-4">
      <summary className="cursor-pointer text-xs font-semibold">
        T02 / T03 · Contents & story images
      </summary>
      <label className="mt-4">
        Contents summary
        <textarea
          value={visual.summary}
          rows={2}
          maxLength={1000}
          onChange={(e) => change({ ...visual, summary: e.target.value })}
        />
      </label>
      <label className="mt-3">
        Contents thumbnail frame
        <select
          value={visual.thumbnailShape ?? "landscape"}
          onChange={(e) =>
            change({
              ...visual,
              thumbnailShape: e.target.value as
                "landscape" | "portrait" | "square",
            })
          }
        >
          <option value="landscape">Landscape · Volumes 15 / 17 / 19</option>
          <option value="portrait">Portrait · Volume 20</option>
          <option value="square">Square</option>
        </select>
      </label>
      <MediaPicker
        label="Contents thumbnail"
        value={visual.thumbnail}
        onChange={(thumbnail) => change({ ...visual, thumbnail })}
      />
      <p className="muted">
        Select the T03 opener in Story layout & appearance (or the section
        template) to use this hero. Included sections receive consecutive
        markers in magazine order; only the first included story displays the
        large marker.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>
          Opener text placement
          <select
            value={visual.position}
            onChange={(e) =>
              change({
                ...visual,
                position: e.target.value as typeof visual.position,
              })
            }
          >
            <option value="below">Full width below hero · Volume 20</option>
            <option value="left">Left narrative panel</option>
            <option value="right">Right narrative panel</option>
          </select>
        </label>
        <label>
          Opener photographic area
          <select
            value={visual.heroLayout}
            onChange={(e) =>
              change({
                ...visual,
                heroLayout: e.target.value as typeof visual.heroLayout,
              })
            }
          >
            <option value="large">Large upper hero</option>
            <option value="full">
              Full-page photograph with narrative panel
            </option>
          </select>
        </label>
      </div>
      <MediaPicker
        label="Opener photograph"
        value={visual.hero}
        onChange={(hero) => change({ ...visual, hero })}
      />
    </details>
  );
}
