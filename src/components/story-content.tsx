"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { blockSchema, type Block, type Story } from "../domain/issue";
import {
  newComponent,
  componentText,
  type EditorialComponent,
  safeLink,
} from "../domain/content";
import { importWordContent, readContentDOM } from "../content/word-paste";
import { EditorialComponentSettings } from "./editorial-component-settings";
import { contentStyles } from "../content/styles";
import { MediaPicker } from "./media-picker";
import { mediaRepository } from "../media/local";
import { imageDataUrl } from "../media/render";
import type { RenderAsset } from "../domain/media";
import { createMediaImage } from "../magazine/media-image";
import { createContentRenderer } from "../content/render";
import {
  bodySnapshot,
  restoreBody,
  type BodySnapshot,
} from "../content/history";
import { renderRichBlock } from "../content/text-dom";
const isComponent = (block: Block) =>
  !!block.component ||
  block.type === "figure" ||
  (!block.text && block.breakBefore === "page");
/** A single editable document. React never resets the caret for an echoed text edit. */
export function StoryContent({
  story,
  paragraphSpacing = "16px",
  onChange,
}: {
  story: Story;
  paragraphSpacing?: string;
  onChange: (story: Story) => void;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const last = useRef("");
  const current = useRef({ story, onChange });
  const range = useRef<Range | null>(null);
  const pendingPaste = useRef<Block[]>([]);
  const dragging = useRef<string | null>(null);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [assets, setAssets] = useState<RenderAsset[]>([]);
  const [insertOpen, setInsertOpen] = useState(false);
  const history = useRef<BodySnapshot[]>([]),
    future = useRef<BodySnapshot[]>([]);
  const selectedBlock = story.blocks.find((block) => block.id === selected);
  const assetKey = [
    ...new Set(
      story.blocks.map((block) => block.image?.assetId).filter(Boolean),
    ),
  ].join("|");
  useEffect(() => {
    let active = true;
    Promise.all(
      assetKey
        .split("|")
        .filter(Boolean)
        .map((id) => mediaRepository.get(id)),
    )
      .then((items) => {
        if (active)
          setAssets(
            items.flatMap((item) =>
              item
                ? [
                    {
                      asset: item.asset,
                      dataUrl: imageDataUrl(item.asset.mimeType, item.bytes),
                    },
                  ]
                : [],
            ),
          );
      })
      .catch(() => {
        if (active)
          setMessage("An inline image could not be read from this browser.");
      });
    return () => {
      active = false;
    };
  }, [assetKey]);
  const view = useCallback(
    (block: Block) => {
      const node = createContentRenderer(
        renderRichBlock,
        createMediaImage,
        assets,
      )(block);
      node.dataset.storyBlock = block.id;
      if (block.breakBefore === "page" && block.text)
        node.dataset.pageBreakBefore = "true";
      if (!isComponent(block)) return node;
      const wrapper = document.createElement("div");
      wrapper.dataset.componentId = block.id;
      wrapper.dataset.storyBlock = block.id;
      wrapper.className = "story-component-view";
      wrapper.contentEditable = "false";
      wrapper.draggable = true;
      wrapper.tabIndex = 0;
      wrapper.setAttribute("role", "button");
      wrapper.setAttribute(
        "aria-label",
        block.component
          ? `Select ${block.component.kind} component`
          : block.type === "figure"
            ? "Select inline image"
            : "Select page break",
      );
      if (block.component || block.type === "figure") wrapper.append(node);
      else wrapper.textContent = "Page break";
      return wrapper;
    },
    [assets],
  );
  useEffect(() => {
    current.current = { story, onChange };
  }, [story, onChange]);
  const draw = useCallback(
    (blocks: Block[]) => {
      const root = editor.current!;
      root.replaceChildren(...blocks.map(view));
      if (!blocks.length) {
        const p = document.createElement("p");
        p.append(document.createElement("br"));
        root.append(p);
      }
    },
    [view],
  );
  useEffect(() => {
    const json = JSON.stringify(story.blocks);
    if (last.current !== json) {
      draw(story.blocks);
      last.current = json;
    }
  }, [story.blocks, draw]);
  useEffect(() => {
    const root = editor.current;
    for (const block of current.current.story.blocks) {
      const existing = root?.querySelector(
        `[data-component-id="${CSS.escape(block.id)}"]`,
      );
      if (existing) existing.replaceWith(view(block));
    }
    // Only node views change; text nodes and the active caret are preserved.
  }, [assets, view]);
  function apply(blocks: Block[], record = true) {
    const previous = current.current.story;
    if (
      JSON.stringify(blocks) === JSON.stringify(previous.blocks) &&
      previous.contentMode === "continuous"
    )
      return;
    if (record) {
      history.current.push(bodySnapshot(previous));
      if (history.current.length > 60) history.current.shift();
      future.current = [];
    }
    const ids = new Set(blocks.map((block) => block.id));
    const grid = previous.grid
      ? {
          ...previous.grid,
          rows: previous.grid.rows.map((row) => ({
            ...row,
            cells: row.cells.map((cell) => ({
              ...cell,
              contentIds: cell.contentIds.filter((id) => ids.has(id)),
            })),
          })),
        }
      : undefined;
    const next: Story = {
      ...previous,
      contentMode: "continuous",
      blocks,
      ...(grid ? { grid } : {}),
    };
    current.current = { ...current.current, story: next };
    current.current.onChange(next);
  }
  function updateBlock(next: Block) {
    apply(
      current.current.story.blocks.map((block) =>
        block.id === next.id ? next : block,
      ),
    );
  }
  function undo(redo = false) {
    const source = redo ? future.current : history.current,
      target = redo ? history.current : future.current;
    const snapshot = source.pop();
    if (!snapshot) return;
    target.push(bodySnapshot(current.current.story));
    const next = restoreBody(current.current.story, snapshot);
    last.current = "";
    range.current = null;
    current.current = { ...current.current, story: next };
    current.current.onChange(next);
  }
  function insert(
    kind: "image" | "page" | "paragraph" | EditorialComponent["kind"],
  ) {
    const blocks = [...current.current.story.blocks];
    const component = !["image", "page", "paragraph"].includes(kind)
      ? newComponent(kind as EditorialComponent["kind"])
      : undefined;
    const block: Block = component
      ? {
          id: crypto.randomUUID(),
          type: component.kind === "testimonial" ? "quote" : "paragraph",
          text: componentText(component),
          component,
        }
      : kind === "image"
        ? {
            id: crypto.randomUUID(),
            type: "figure",
            text: "",
            figureHeightMm: 70,
          }
        : {
            id: crypto.randomUUID(),
            type: "paragraph",
            text: "",
            rich: { runs: [], align: "left" },
            ...(kind === "page" ? { breakBefore: "page" as const } : {}),
          };
    const anchor = range.current?.startContainer;
    const element = anchor instanceof Element ? anchor : anchor?.parentElement;
    const at = blocks.findIndex(
      (block) =>
        block.id ===
        element?.closest<HTMLElement>("[data-story-block]")?.dataset.storyBlock,
    );
    blocks.splice(at >= 0 ? at + 1 : blocks.length, 0, block);
    if (kind !== "paragraph" && blocks.at(-1)?.id === block.id)
      blocks.push({
        id: crypto.randomUUID(),
        type: "paragraph",
        text: "",
        rich: { runs: [], align: "left" },
      });
    range.current = null;
    last.current = "";
    apply(blocks);
    setSelected(kind === "paragraph" ? null : block.id);
    setInsertOpen(false);
  }
  function remember() {
    const selection = window.getSelection();
    if (selection?.rangeCount && editor.current?.contains(selection.anchorNode))
      range.current = selection.getRangeAt(0).cloneRange();
  }
  function clearDropMarker() {
    editor.current
      ?.querySelectorAll("[data-story-drop]")
      .forEach((node) => node.removeAttribute("data-story-drop"));
  }
  function dragTarget(event: { target: EventTarget; clientY: number }) {
    const node =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-story-block]")
        : null;
    if (!node || !editor.current?.contains(node)) return null;
    const rect = node.getBoundingClientRect();
    return {
      id: node.dataset.storyBlock!,
      before: event.clientY < rect.top + rect.height / 2,
      node,
    };
  }
  function publish() {
    const previous = current.current.story;
    const blocks = readContentDOM(editor.current!, [
      ...previous.blocks,
      ...pendingPaste.current,
    ]);
    if (
      blocks.length > 1000 ||
      blocks.some((block) => !blockSchema.safeParse(block).success)
    ) {
      setMessage(
        "Content exceeds the supported record limits. Your text remains in the editor; shorten it before saving.",
      );
      return;
    }
    const missing = previous.blocks.filter(
      (block) =>
        isComponent(block) && !blocks.some((next) => next.id === block.id),
    );
    if (missing.length) {
      for (const block of missing)
        blocks.splice(
          Math.min(previous.blocks.indexOf(block), blocks.length),
          0,
          block,
        );
      draw(blocks);
      setMessage(
        "Components are retained during text deletion. Select one and use Remove component to delete it explicitly.",
      );
    }
    last.current = JSON.stringify(blocks);
    apply(blocks);
    remember();
  }
  function restore() {
    editor.current?.focus();
    const selection = window.getSelection();
    if (
      range.current &&
      editor.current?.contains(range.current.commonAncestorContainer)
    ) {
      selection?.removeAllRanges();
      selection?.addRange(range.current);
    }
  }
  function command(name: string, value?: string) {
    restore();
    document.execCommand(name, false, value);
    publish();
  }
  function paste(html: string, text: string) {
    const result = importWordContent(html, text);
    if (
      result.blocks.some((block) => !blockSchema.safeParse(block).success) ||
      current.current.story.blocks.length + result.blocks.length > 1000
    ) {
      setMessage(
        "This paste exceeds the supported record limits (1,000 blocks, 500 table rows, 12 columns, or 200,000 characters per block). Nothing was inserted or removed. Split the source into smaller sections before pasting.",
      );
      return;
    }
    const host = document.createElement("div");
    pendingPaste.current = result.blocks;
    result.blocks.forEach((block) => host.append(view(block)));
    restore();
    document.execCommand("insertHTML", false, host.innerHTML);
    publish();
    pendingPaste.current = [];
    setMessage(result.warnings.join(" "));
  }
  return (
    <section
      className="story-content-editor"
      aria-label="Story Content"
      style={{ "--story-paragraph-gap": paragraphSpacing } as CSSProperties}
    >
      <style>{contentStyles}</style>
      <h3>Story Content</h3>
      <div
        className="story-content-toolbar"
        role="toolbar"
        aria-label="Story formatting"
      >
        {[
          ["Bold", "bold"],
          ["Italic", "italic"],
          ["Underline", "underline"],
          ["Bullets", "insertUnorderedList"],
          ["Numbered list", "insertOrderedList"],
          ["Left", "justifyLeft"],
          ["Centre", "justifyCenter"],
          ["Right", "justifyRight"],
          ["Justify", "justifyFull"],
        ].map(([label, name]) => (
          <button
            type="button"
            key={name}
            title={label}
            aria-label={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(name)}
          >
            {label === "Bold" ? (
              <b>B</b>
            ) : label === "Italic" ? (
              <i>I</i>
            ) : label === "Underline" ? (
              <u>U</u>
            ) : (
              label
            )}
          </button>
        ))}
        <select
          aria-label="Body style"
          defaultValue="p"
          onMouseDown={remember}
          onChange={(e) => command("formatBlock", e.target.value)}
        >
          <option value="p">Paragraph</option>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={`h${n}`}>
              Heading {n}
            </option>
          ))}
        </select>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const link = window.prompt("Link URL or email address");
            if (!link) return;
            const href = safeLink(link);
            if (!href) {
              setMessage("Use an http, https, mailto or tel link.");
              return;
            }
            command("createLink", href);
          }}
        >
          Link
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command("unlink")}
        >
          Unlink
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => undo()}
        >
          Undo
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => undo(true)}
        >
          Redo
        </button>
      </div>
      <div className="story-insert-menu">
        <button
          type="button"
          className="button secondary"
          aria-expanded={insertOpen}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setInsertOpen(!insertOpen)}
        >
          + Insert
        </button>
        {insertOpen && (
          <div role="group" aria-label="Insert story content">
            {[
              ["image", "Image"],
              ["table", "Table"],
              ["profile", "Employee Profile"],
              ["testimonial", "Quote / Testimonial"],
              ["cta", "CTA Box"],
              ["info", "Information Box"],
              ["page", "Page break"],
              ["paragraph", "Paragraph"],
            ].map(([kind, label]) => (
              <button
                type="button"
                className="text-button"
                key={kind}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() =>
                  insert(
                    kind as
                      | "image"
                      | "page"
                      | "paragraph"
                      | EditorialComponent["kind"],
                  )
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedBlock && (
        <div
          className="story-component-settings"
          aria-label="Selected component settings"
        >
          <button
            type="button"
            className="text-button"
            onClick={() => setSelected(null)}
          >
            Close component settings
          </button>
          {selectedBlock.component && (
            <EditorialComponentSettings
              key={selectedBlock.id}
              block={selectedBlock}
              onChange={updateBlock}
            />
          )}
          {!selectedBlock.component && selectedBlock.type === "figure" && (
            <>
              <MediaPicker
                compact
                decorative
                label="Inline image"
                value={selectedBlock.image}
                onChange={(image) => updateBlock({ ...selectedBlock, image })}
              />
              <label>
                Image caption
                <input
                  value={selectedBlock.text}
                  onChange={(e) =>
                    updateBlock({ ...selectedBlock, text: e.target.value })
                  }
                />
              </label>
              <label>
                Image height (mm)
                <input
                  type="number"
                  min={20}
                  max={180}
                  value={selectedBlock.figureHeightMm ?? 70}
                  onChange={(e) =>
                    updateBlock({
                      ...selectedBlock,
                      figureHeightMm: Math.max(
                        20,
                        Math.min(180, Number(e.target.value)),
                      ),
                    })
                  }
                />
              </label>
              <label>
                Image width (%)
                <input
                  type="range"
                  min={25}
                  max={100}
                  value={selectedBlock.widthPercent ?? 100}
                  onChange={(e) =>
                    updateBlock({
                      ...selectedBlock,
                      widthPercent: Number(e.target.value),
                    })
                  }
                />
              </label>
            </>
          )}
          <div className="inline-actions">
            {[-1, 1].map((direction) => (
              <button
                type="button"
                key={direction}
                className="text-button"
                disabled={
                  story.blocks.indexOf(selectedBlock) + direction < 0 ||
                  story.blocks.indexOf(selectedBlock) + direction >=
                    story.blocks.length
                }
                onClick={() => {
                  const blocks = [...story.blocks],
                    index = blocks.indexOf(selectedBlock);
                  [blocks[index], blocks[index + direction]] = [
                    blocks[index + direction],
                    blocks[index],
                  ];
                  last.current = "";
                  apply(blocks);
                }}
              >
                {direction < 0 ? "Move component up" : "Move component down"}
              </button>
            ))}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                if (
                  window.confirm(
                    "Remove this component? Its image original remains stored in this browser.",
                  )
                ) {
                  last.current = "";
                  apply(
                    story.blocks.filter(
                      (block) => block.id !== selectedBlock.id,
                    ),
                  );
                  setSelected(null);
                }
              }}
            >
              Remove component
            </button>
          </div>
        </div>
      )}
      <div
        ref={editor}
        className="story-content-surface"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Complete story content"
        aria-multiline="true"
        onClick={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("a") &&
            !event.ctrlKey &&
            !event.metaKey
          )
            event.preventDefault();
          const target =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>("[data-component-id]")
              : null;
          setSelected(target?.dataset.componentId ?? null);
        }}
        onDragStart={(event) => {
          const target =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>("[data-component-id]")
              : null;
          if (!target) return;
          dragging.current = target.dataset.componentId!;
          event.dataTransfer.setData(
            "application/x-ecu-story-block",
            dragging.current,
          );
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(event) => {
          if (!dragging.current) return;
          event.preventDefault();
          const target = dragTarget(event);
          clearDropMarker();
          if (target && target.id !== dragging.current)
            target.node.dataset.storyDrop = target.before ? "before" : "after";
        }}
        onDrop={(event) => {
          event.preventDefault();
          const source = dragging.current;
          dragging.current = null;
          clearDropMarker();
          const target = dragTarget(event);
          if (!source || !target || source === target.id) return;
          const blocks = [...current.current.story.blocks];
          const block = blocks.find((block) => block.id === source);
          if (!block) return;
          const rest = blocks.filter((block) => block.id !== source);
          const index = rest.findIndex((block) => block.id === target.id);
          if (index < 0) return;
          rest.splice(index + (target.before ? 0 : 1), 0, block);
          last.current = "";
          apply(rest);
          setSelected(source);
          setMessage(
            "Component moved. Saved styling and original image references are unchanged.",
          );
        }}
        onDragEnd={() => {
          dragging.current = null;
          clearDropMarker();
        }}
        onKeyDown={(event) => {
          if (["Backspace", "Delete"].includes(event.key)) {
            const selection = window.getSelection();
            if (
              selection?.rangeCount &&
              !selection.isCollapsed &&
              Array.from(
                editor.current?.querySelectorAll("[data-component-id]") ?? [],
              ).some((node) => selection.getRangeAt(0).intersectsNode(node))
            ) {
              event.preventDefault();
              setMessage(
                "Components are retained during text deletion. Select one and use Remove component to delete it explicitly.",
              );
              return;
            }
          }
          const component =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>("[data-component-id]")
              : null;
          if (component && ["Enter", " "].includes(event.key)) {
            event.preventDefault();
            setSelected(component.dataset.componentId!);
            return;
          }
          if (
            (event.ctrlKey || event.metaKey) &&
            ["z", "y"].includes(event.key.toLowerCase())
          ) {
            event.preventDefault();
            undo(event.shiftKey || event.key.toLowerCase() === "y");
          }
        }}
        onInput={publish}
        onKeyUp={remember}
        onMouseUp={remember}
        onBlur={remember}
        onPaste={(e) => {
          e.preventDefault();
          paste(
            e.clipboardData.getData("text/html"),
            e.clipboardData.getData("text/plain"),
          );
        }}
      />
      {message && (
        <p role="status" className="helper">
          {message}
        </p>
      )}
    </section>
  );
}
