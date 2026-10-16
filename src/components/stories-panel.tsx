"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Trash2,
  GripVertical,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  sectionNames,
  type Issue,
  type Section,
  type Story,
} from "../domain/issue";
import type { StoryDrag } from "../studio/reorder";
import { useStoriesDrag } from "./use-stories-drag";
import { StoryThumbnail, useStoryThumbnails } from "./story-thumbnails";
import "./stories-panel.css";
export function StoriesPanel({
  issue,
  sectionId,
  storyId,
  details,
  previewClick,
  onDetails,
  onSection,
  onStory,
  onAddStory,
  onAddSection,
  onReorder,
  onMoveSection,
  onVisibility,
  onRemoveSection,
}: {
  issue: Issue;
  sectionId?: string;
  storyId?: string;
  details: boolean;
  previewClick?: number;
  onRemoveSection: (section: Section) => void;
  onDetails: () => void;
  onSection: (s: Section) => void;
  onStory: (s: Section, story: Story) => void;
  onAddStory: (s: Section) => void;
  onAddSection: (type: string) => void;
  onReorder: (
    source: StoryDrag,
    target: string,
    before?: string,
    edge?: "before" | "after",
  ) => void;
  onMoveSection: (index: number, direction: -1 | 1) => void;
  onVisibility: (sectionId: string, storyId?: string) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const [closed, setClosed] = useState<Set<string>>(new Set()),
    [opened, setOpened] = useState<Set<string>>(new Set()),
    [sectionType, setSectionType] = useState<string>(sectionNames[0]);
  const [lastPreviewClick, setLastPreviewClick] = useState(previewClick);
  if (lastPreviewClick !== previewClick) {
    setLastPreviewClick(previewClick);
    if (sectionId) {
      setClosed((value) => {
        const next = new Set(value);
        next.delete(sectionId);
        return next;
      });
      setOpened((value) => new Set(value).add(sectionId));
    }
  }
  const isExpanded = (id: string) =>
    !closed.has(id) && (opened.has(id) || sectionId === id);
  const thumbnails = useStoryThumbnails(
    issue.sections.flatMap((s) =>
      isExpanded(s.id) ? s.stories.map((story) => story.id) : [],
    ),
  );
  // Freeze current expansion on pickup; moving a selected story must not open or close sections.
  const { dragging, indicator, ghost, announcement, handle } = useStoriesDrag(
    root,
    issue,
    onReorder,
    () => {
      setOpened(
        new Set(
          issue.sections.filter((s) => isExpanded(s.id)).map((s) => s.id),
        ),
      );
      setClosed(
        new Set(
          issue.sections.filter((s) => !isExpanded(s.id)).map((s) => s.id),
        ),
      );
    },
  );
  return (
    <nav
      ref={root}
      className="editor-outline stories-panel"
      aria-label="Magazine structure"
      data-dragging={!!dragging}
    >
      <div className="stories-title">
        <h2>Stories</h2>
        <details className="section-create-menu">
          <summary title="Add section">
            <Plus size={14} /> Section
          </summary>
          <div className="add-section">
            <label>
              New section type
              <select
                value={sectionType}
                onChange={(e) => setSectionType(e.target.value)}
              >
                {sectionNames.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <button
              className="outline-add"
              disabled={issue.sections.length >= 30}
              onClick={(event) => {
                onAddSection(sectionType);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
            >
              <Plus size={14} />
              Add section
            </button>
          </div>
        </details>
      </div>
      <button
        className="outline-item outline-details"
        aria-current={details ? "true" : undefined}
        onClick={onDetails}
      >
        <BookOpen size={18} />
        <span>
          Magazine Details<small>Title, cover and design</small>
        </span>
      </button>
      <p className="sr-only" id="stories-drag-instructions">
        Use a drag handle to move an item. With the keyboard, press Space, use
        Up or Down to choose a position, then Space to drop. Escape cancels.
      </p>
      <ol className="outline-sections">
        {issue.sections.map((s, index) => {
          const expanded = isExpanded(s.id);
          const sectionSource: StoryDrag = { kind: "section", id: s.id };
          return (
            <li
              key={s.id}
              data-section-id={s.id}
              data-drag-source={
                dragging?.source.kind === "section" &&
                dragging.source.id === s.id
              }
              className={expanded ? "expanded" : undefined}
            >
              <div
                className="outline-row"
                data-selected={sectionId === s.id}
                data-hidden={!s.enabled}
              >
                <button
                  className="stories-drag-handle icon-button"
                  aria-label={"Drag section: " + s.name}
                  aria-describedby="stories-drag-instructions"
                  aria-pressed={
                    dragging?.source.kind === "section" &&
                    dragging.source.id === s.id
                  }
                  {...handle(sectionSource, s.name)}
                >
                  <GripVertical size={14} aria-hidden="true" />
                </button>
                <button
                  className="section-toggle icon-button"
                  aria-label={(expanded ? "Collapse " : "Expand ") + s.name}
                  aria-expanded={expanded}
                  onClick={() => {
                    setClosed((value) => {
                      const next = new Set(value);
                      if (expanded) next.add(s.id);
                      else next.delete(s.id);
                      return next;
                    });
                    setOpened((value) => new Set(value).add(s.id));
                  }}
                >
                  {expanded ? (
                    <ChevronDown size={15} />
                  ) : (
                    <ChevronRight size={15} />
                  )}
                </button>
                <button
                  className="outline-item outline-section"
                  aria-expanded={expanded}
                  aria-current={
                    sectionId === s.id && !storyId ? "true" : undefined
                  }
                  onClick={() => {
                    setClosed((value) => {
                      const next = new Set(value);
                      next.delete(s.id);
                      return next;
                    });
                    onSection(s);
                  }}
                >
                  <span>
                    {s.name || "Untitled section"}
                    <small> ({s.stories.length})</small>
                  </span>
                </button>
                <button
                  className="icon-button section-add-story"
                  aria-label={"Add story to " + s.name}
                  title="Add story"
                  disabled={s.stories.length >= 50}
                  onClick={() => onAddStory(s)}
                >
                  <Plus size={15} />
                </button>
                <button
                  className="item-visibility icon-button"
                  aria-label={
                    (s.enabled ? "Hide" : "Show") + " section: " + s.name
                  }
                  aria-pressed={s.enabled}
                  title={
                    s.enabled ? "Visible in magazine" : "Hidden from magazine"
                  }
                  onClick={() => onVisibility(s.id)}
                >
                  {s.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  className="icon-button section-delete"
                  aria-label={"Delete section: " + s.name}
                  title="Delete section"
                  onClick={() => onRemoveSection(s)}
                >
                  <Trash2 size={14} />
                </button>
                <div className="outline-order">
                  <button
                    className="icon-button"
                    aria-label={`Move ${s.name} up`}
                    disabled={index === 0}
                    onClick={() => onMoveSection(index, -1)}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Move ${s.name} down`}
                    disabled={index === issue.sections.length - 1}
                    onClick={() => onMoveSection(index, 1)}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
              {expanded && (
                <ul
                  className="outline-stories"
                  aria-label={"Stories in " + s.name}
                >
                  {s.stories.map((item) => {
                    const source: StoryDrag = {
                      kind: "story",
                      id: item.id,
                      sectionId: s.id,
                    };
                    return (
                      <li
                        key={item.id}
                        data-story-id={item.id}
                        data-story-row={item.id}
                        data-drag-source={
                          dragging?.source.kind === "story" &&
                          dragging.source.id === item.id
                        }
                      >
                        <div
                          className="story-line"
                          data-hidden={!s.enabled || !item.enabled}
                          data-selected={storyId === item.id}
                        >
                          <button
                            className="stories-drag-handle icon-button"
                            aria-label={"Drag story: " + item.title}
                            aria-describedby="stories-drag-instructions"
                            aria-pressed={
                              dragging?.source.kind === "story" &&
                              dragging.source.id === item.id
                            }
                            {...handle(source, item.title)}
                          >
                            <GripVertical size={14} aria-hidden="true" />
                          </button>
                          <button
                            className="outline-item outline-story"
                            aria-label={item.title || "Untitled story"}
                            aria-current={
                              storyId === item.id ? "true" : undefined
                            }
                            onClick={() => onStory(s, item)}
                          >
                            <StoryThumbnail
                              snapshot={thumbnails.stories[item.id]}
                              sheet={thumbnails.sheet}
                            />
                            <span className="story-row-copy">
                              <span className="story-row-title">
                                {item.title || "Untitled story"}
                              </span>
                              <small>
                                {!s.enabled || !item.enabled
                                  ? "Hidden from magazine"
                                  : thumbnails.stories[item.id]
                                    ? thumbnails.stories[item.id].first ===
                                      thumbnails.stories[item.id].last
                                      ? `Page ${thumbnails.stories[item.id].first}`
                                      : `Pages ${thumbnails.stories[item.id].first}–${thumbnails.stories[item.id].last}`
                                    : "Updating pages…"}
                              </small>
                            </span>
                          </button>
                          <button
                            className="item-visibility icon-button"
                            aria-label={
                              (item.enabled ? "Hide" : "Show") +
                              " story: " +
                              item.title
                            }
                            aria-pressed={item.enabled}
                            title={
                              !item.enabled
                                ? "Hidden from magazine"
                                : s.enabled
                                  ? "Visible in magazine"
                                  : "Visible when its section is restored"
                            }
                            onClick={() => onVisibility(s.id, item.id)}
                          >
                            {item.enabled ? (
                              <Eye size={16} />
                            ) : (
                              <EyeOff size={16} />
                            )}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                  <li className="story-end-drop">
                    <button
                      className="outline-add"
                      disabled={s.stories.length >= 50}
                      onClick={() => onAddStory(s)}
                    >
                      <Plus size={16} />
                      Add story
                    </button>
                  </li>
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <style>{thumbnails.fonts}</style>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {dragging &&
        createPortal(
          <div
            ref={ghost}
            className="stories-drag-overlay"
            aria-hidden="true"
            style={{
              position: "fixed",
              left: dragging.box.left,
              top: dragging.box.top,
              width: dragging.box.width,
              transform: "translate3d(0," + dragging.offset + "px,0)",
            }}
          >
            <GripVertical size={14} />
            <span>{dragging.label}</span>
          </div>,
          document.body,
        )}
      {indicator &&
        createPortal(
          <div
            className="stories-insertion-indicator"
            data-target-section={indicator.target.sectionId}
            data-target-story={indicator.target.beforeStoryId}
            aria-hidden="true"
            style={{
              position: "fixed",
              left: indicator.left,
              top: indicator.top,
              width: indicator.width,
            }}
          />,
          document.body,
        )}
    </nav>
  );
}
