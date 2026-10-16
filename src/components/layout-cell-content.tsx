"use client";
import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  Copy,
  GripVertical,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { id, type Story } from "../domain/issue";
import type { LayoutBlock } from "../domain/grid";
import { MediaPicker } from "./media-picker";
import { GridImage } from "./grid-image";
import "./layout-cell-content.css";
const sources = {
  headline: "Headline",
  introduction: "Introduction",
  author: "Author",
  article: "Article",
} as const;
const manualChoices = [
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "Paragraph",
  "Bulleted List",
  "Numbered List",
  "Image",
  "Quote",
  "Divider",
  "Spacer",
];
function name(block: LayoutBlock) {
  return block.kind === "linked"
    ? "Linked " + sources[block.source]
    : block.type === "heading"
      ? "H" + (block.level ?? 2)
      : block.type === "figure"
        ? "Image"
        : block.type === "list"
          ? block.ordered
            ? "Numbered List"
            : "Bulleted List"
          : block.type[0].toUpperCase() + block.type.slice(1);
}
/** A native textarea keeps cursor/selection and Enter behavior; styling makes it a direct canvas surface. */
export function InlineLayoutText({
  value,
  label,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  autoFocus = false,
  level,
}: {
  value: string;
  label: string;
  onChange: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  level?: number;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const node = field.current;
    if (!node) return;
    const resize = () => {
      node.style.height = "0px";
      node.style.height = Math.min(360, Math.max(30, node.scrollHeight)) + "px";
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node.parentElement!);
    return () => observer.disconnect();
  }, [value]);
  useEffect(() => {
    if (autoFocus) field.current?.focus();
  }, [autoFocus]);
  return (
    <textarea
      ref={field}
      className="layout-inline-text"
      data-heading-level={level}
      aria-label={label}
      value={value}
      maxLength={20000}
      rows={1}
      placeholder={placeholder ?? "Type here…"}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}
export function LayoutCellContent({
  blocks,
  story,
  onChange,
  onStoryChange,
  onDrag,
  onDrop,
  canDrop,
  selected,
  onSelect,
  onTextEnd,
}: {
  blocks: LayoutBlock[];
  story: Story;
  onChange: (blocks: LayoutBlock[], textEditKey?: string) => void;
  onStoryChange: (story: Story) => void;
  onDrag: (event: DragEvent, id: string) => void;
  onDrop: (event: DragEvent, beforeId: string) => void;
  canDrop: () => boolean;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onTextEnd: () => void;
}) {
  const [focusId, setFocusId] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [over, setOver] = useState<string | null>(null);
  const menu = useRef<HTMLDetailsElement>(null),
    search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const clear = () => setOver(null);
    window.addEventListener("dragend", clear);
    window.addEventListener("drop", clear);
    return () => {
      window.removeEventListener("dragend", clear);
      window.removeEventListener("drop", clear);
    };
  }, []);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node))
        menu.current.open = false;
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector<HTMLElement>("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  function add(block: LayoutBlock) {
    onChange([...blocks, block]);
    onSelect(block.id);
    setFocusId(block.id);
    setQuery("");
    if (menu.current) menu.current.open = false;
  }
  function update(block: LayoutBlock, text = false) {
    onChange(
      blocks.map((b) => (b.id === block.id ? block : b)),
      text ? block.id : undefined,
    );
  }
  function matches(label: string, category: string) {
    return (label + " " + category)
      .toLowerCase()
      .includes(query.trim().toLowerCase());
  }
  const linkedChoices = Object.entries(sources).filter(([, label]) =>
      matches(label, "Linked Content"),
    ),
    manual = manualChoices.filter((label) => matches(label, "Manual Content"));
  return (
    <div className="layout-cell-content">
      {blocks.map((block, i) => {
        const active = selected === block.id;
        return (
          <div
            key={block.id}
            data-layout-block={block.id}
            data-selected={active}
            className="layout-content-block"
            data-drop-before={over === block.id}
            onFocusCapture={(e) => {
              if (!(
                e.target instanceof Element &&
                e.target.closest(
                  ".layout-article-surface, .layout-image-preview",
                )
              ))
                onSelect(block.id);
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) onSelect(block.id);
            }}
            onDragOver={(e) => {
              if (canDrop()) {
                e.preventDefault();
                e.stopPropagation();
                setOver(block.id);
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setOver(null);
            }}
            onDrop={(e) => {
              setOver(null);
              if (canDrop()) onDrop(e, block.id);
            }}
          >
            <div
              className="layout-block-toolbar"
              role="toolbar"
              aria-label={"Block controls " + (i + 1)}
            >
              <button
                className="icon-button"
                draggable
                onDragStart={(e) => onDrag(e, block.id)}
                aria-label={"Drag layout content " + (i + 1)}
              >
                <GripVertical size={14} />
              </button>
              <span className="layout-block-label">{name(block)}</span>
              <button
                className="icon-button"
                aria-label="Duplicate block"
                title="Duplicate"
                disabled={
                  blocks.length >= 100 ||
                  (block.kind === "linked" && block.source === "article")
                }
                onClick={() => {
                  const copy = { ...block, id: id() };
                  onChange([
                    ...blocks.slice(0, i + 1),
                    copy,
                    ...blocks.slice(i + 1),
                  ]);
                  onSelect(copy.id);
                }}
              >
                <Copy size={14} />
              </button>
              <button
                className="icon-button"
                aria-label="Delete block"
                title="Delete"
                onClick={() => {
                  onChange(blocks.filter((b) => b.id !== block.id));
                  onSelect(null);
                }}
              >
                <Trash2 size={14} />
              </button>
              <details className="layout-block-actions">
                <summary aria-label={"Content actions " + (i + 1)}>
                  <MoreHorizontal size={15} />
                </summary>
                <div>
                  <button
                    disabled={i === 0}
                    onClick={(e) => {
                      const next = [...blocks];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      onChange(next);
                      e.currentTarget.closest("details")!.open = false;
                    }}
                  >
                    Move up
                  </button>
                  <button
                    disabled={i === blocks.length - 1}
                    onClick={(e) => {
                      const next = [...blocks];
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      onChange(next);
                      e.currentTarget.closest("details")!.open = false;
                    }}
                  >
                    Move down
                  </button>
                  {block.kind === "manual" && block.type === "heading" && (
                    <label>
                      Heading level
                      <select
                        aria-label="Manual heading level"
                        value={block.level ?? 2}
                        onChange={(e) =>
                          update({ ...block, level: Number(e.target.value) })
                        }
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            H{n}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {block.kind === "manual" && block.type === "list" && (
                    <label>
                      List style
                      <select
                        value={block.ordered ? "numbered" : "bulleted"}
                        onChange={(e) =>
                          update({
                            ...block,
                            ordered: e.target.value === "numbered",
                          })
                        }
                      >
                        <option value="bulleted">Bulleted</option>
                        <option value="numbered">Numbered</option>
                      </select>
                    </label>
                  )}
                  {block.kind === "manual" &&
                    ["figure", "spacer"].includes(block.type) && (
                      <label>
                        Height (mm)
                        <input
                          type="number"
                          min={block.type === "figure" ? 20 : 1}
                          max={180}
                          value={
                            block.heightMm ??
                            (block.type === "figure" ? 70 : 10)
                          }
                          onChange={(e) =>
                            update({
                              ...block,
                              heightMm: Math.max(
                                block.type === "figure" ? 20 : 1,
                                Math.min(180, Number(e.target.value)),
                              ),
                            })
                          }
                        />
                      </label>
                    )}
                </div>
              </details>
            </div>
            {block.kind === "linked" ? (
              block.source === "article" ? (
                active ? (
                  <div className="layout-linked-source">
                    {story.blocks.map((source, si) => (
                      <InlineLayoutText
                        key={source.id}
                        label={"Linked Article block " + (si + 1)}
                        value={source.text}
                        autoFocus={focusId === block.id && si === 0}
                        onBlur={() => setFocusId(null)}
                        onChange={(text) =>
                          onStoryChange({
                            ...story,
                            blocks: story.blocks.map((b) =>
                              b.id === source.id ? { ...b, text } : b,
                            ),
                          })
                        }
                        placeholder={
                          source.type === "figure"
                            ? "Image caption"
                            : "Article text…"
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <button
                    className="layout-article-surface"
                    onClick={() => {
                      setFocusId(block.id);
                      onSelect(block.id);
                    }}
                  >
                    {story.blocks
                      .map((b) => b.text)
                      .join("\n")
                      .slice(0, 300) || "Article Content — click to edit"}
                  </button>
                )
              ) : (
                <InlineLayoutText
                  label={"Linked " + sources[block.source]}
                  value={
                    block.source === "headline"
                      ? story.title
                      : block.source === "introduction"
                        ? story.subtitle
                        : story.byline
                  }
                  onChange={(text) =>
                    onStoryChange({
                      ...story,
                      [block.source === "headline"
                        ? "title"
                        : block.source === "introduction"
                          ? "subtitle"
                          : "byline"]: text.slice(
                        0,
                        block.source === "headline"
                          ? 200
                          : block.source === "introduction"
                            ? 500
                            : 150,
                      ),
                    })
                  }
                  autoFocus={focusId === block.id}
                  placeholder={sources[block.source]}
                />
              )
            ) : (
              <>
                {block.type === "figure" && (
                  <div className="layout-image-surface">
                    {active ? (
                      <MediaPicker
                        label="Manual image"
                        value={block.image}
                        onChange={(image) => update({ ...block, image })}
                      />
                    ) : (
                      <button
                        className="layout-image-preview"
                        aria-label="Edit image"
                        onClick={() => onSelect(block.id)}
                      >
                        <GridImage
                          key={block.image?.assetId ?? "missing"}
                          block={{
                            id: block.id,
                            type: "figure",
                            text: block.text,
                            image: block.image,
                          }}
                        />
                      </button>
                    )}
                  </div>
                )}
                {!["divider", "spacer"].includes(block.type) && (
                  <InlineLayoutText
                    label="Manual content text"
                    value={block.text}
                    onChange={(text) => update({ ...block, text }, true)}
                    onBlur={onTextEnd}
                    autoFocus={focusId === block.id}
                    level={
                      block.type === "heading" ? (block.level ?? 2) : undefined
                    }
                    placeholder={
                      block.type === "list"
                        ? "First item — Enter adds another"
                        : block.type === "figure"
                          ? "Image caption…"
                          : "Type here…"
                    }
                  />
                )}
                {block.type === "divider" && (
                  <button
                    className="layout-divider-surface"
                    aria-label="Select divider"
                    onClick={() => onSelect(block.id)}
                  >
                    <hr />
                  </button>
                )}
                {block.type === "spacer" && (
                  <button
                    className="layout-spacer-surface"
                    aria-label="Select spacer"
                    onClick={() => onSelect(block.id)}
                    style={{
                      minHeight: Math.max(20, (block.heightMm ?? 10) * 2),
                    }}
                  >
                    {active ? "Spacer" : ""}
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
      <details
        ref={menu}
        className="layout-add-content"
        onToggle={(e) => {
          if (e.currentTarget.open) {
            requestAnimationFrame(() => {
              if (menu.current?.open) search.current?.focus();
            });
          }
        }}
      >
        <summary
          onClick={() => {
            if (!menu.current?.open) setQuery("");
          }}
        >
          <Plus size={13} /> Add Content
        </summary>
        <div
          className="layout-content-picker"
          role="group"
          aria-label="Add cell content"
        >
          <label className="layout-content-search">
            <Search size={13} />
            <input
              ref={search}
              aria-label="Search content"
              placeholder="Search content…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "Enter") {
                  e.preventDefault();
                  const first = e.currentTarget
                    .closest(".layout-content-picker")
                    ?.querySelector<HTMLButtonElement>("button:not(:disabled)");
                  if (e.key === "Enter") first?.click();
                  else first?.focus();
                }
              }}
            />
          </label>
          <div
            className="layout-content-results"
            onKeyDown={(e) => {
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key))
                return;
              e.preventDefault();
              const buttons = Array.from(
                  e.currentTarget.querySelectorAll<HTMLButtonElement>(
                    "button:not(:disabled)",
                  ),
                ),
                index = buttons.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
              buttons[
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? buttons.length - 1
                    : (index +
                        (e.key === "ArrowUp" ? -1 : 1) +
                        buttons.length) %
                      buttons.length
              ]?.focus();
            }}
          >
            {!!linkedChoices.length && (
              <div role="group" aria-label="Linked Content">
                <small>Linked Content</small>
                {linkedChoices.map(([source, label]) => (
                  <button
                    key={source}
                    disabled={
                      blocks.length >= 100 ||
                      (source === "article" &&
                        blocks.some(
                          (b) => b.kind === "linked" && b.source === "article",
                        ))
                    }
                    onClick={() =>
                      add({
                        id: id(),
                        kind: "linked",
                        source: source as keyof typeof sources,
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {!!manual.length && (
              <div role="group" aria-label="Manual Content">
                <small>Manual Content</small>
                {manual.map((choice) => (
                  <button
                    key={choice}
                    disabled={blocks.length >= 100}
                    onClick={() =>
                      add({
                        id: id(),
                        kind: "manual",
                        type: choice.startsWith("H")
                          ? "heading"
                          : choice === "Image"
                            ? "figure"
                            : choice.endsWith("List")
                              ? "list"
                              : (choice.toLowerCase() as
                                  "paragraph" | "quote" | "divider" | "spacer"),
                        text: "",
                        ...(choice.startsWith("H")
                          ? { level: Number(choice[1]) }
                          : {}),
                        ...(choice.endsWith("List")
                          ? { ordered: choice === "Numbered List" }
                          : {}),
                      })
                    }
                  >
                    {choice}
                  </button>
                ))}
              </div>
            )}
            {!linkedChoices.length && !manual.length && (
              <p role="status">No matching content</p>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
