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
    <details id="cover-design" className="mt-5 border-t border-[#E5E5E5] pt-4">
      <summary className="cursor-pointer text-xs font-semibold">
        Cover Design
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label>
          Cover headline
          <input
            value={cover.headline}
            placeholder="Use magazine title"
            maxLength={200}
            onChange={(e) => change({ ...cover, headline: e.target.value })}
          />
        </label>
        <label>
          Cover edition label
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
          Cover background
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
        label="Cover photo"
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
    <details
      id={"story-images-" + story.id}
      className="mb-5 border-b border-[#E5E5E5] pb-4"
    >
      <summary className="cursor-pointer text-xs font-semibold">
        Contents & Story Images
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
        Contents image shape
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
        Choose Photo opener in Story Design to use the opening photo. Only the
        first included story in a section shows its large section number.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>
          Opening text position
          <select
            value={visual.position}
            onChange={(e) =>
              change({
                ...visual,
                position: e.target.value as typeof visual.position,
              })
            }
          >
            <option value="below">Full width below the photo</option>
            <option value="left">Text on the left</option>
            <option value="right">Text on the right</option>
          </select>
        </label>
        <label>
          Opening photo size
          <select
            value={visual.heroLayout}
            onChange={(e) =>
              change({
                ...visual,
                heroLayout: e.target.value as typeof visual.heroLayout,
              })
            }
          >
            <option value="large">Large photo at the top</option>
            <option value="full">Full-page photo with text</option>
          </select>
        </label>
      </div>
      <MediaPicker
        label="Opening photo"
        value={visual.hero}
        onChange={(hero) => change({ ...visual, hero })}
      />
    </details>
  );
}
