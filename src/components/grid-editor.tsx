"use client";
import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  Plus,
  GripVertical,
  MoreHorizontal,
  Undo2,
  Redo2,
  Bold,
  Italic,
  SlidersHorizontal,
} from "lucide-react";
import { id, type Story, type Block } from "../domain/issue";
import {
  gridSchema,
  makeRow,
  type GridLayout,
  type GridRow,
} from "../domain/grid";
import {
  initialGrid,
  resizeRow,
  detachRow,
  moveContent,
  moveLayoutBlock,
  applyPreset,
  loadPresets,
  savePreset,
  type LayoutPreset,
} from "../studio/grid-layout";
import { GridImage } from "./grid-image";
import { MediaPicker } from "./media-picker";
import { LayoutCellContent } from "./layout-cell-content";
const patterns = [[12], [6, 6], [8.4, 3.6], [3.6, 8.4], [4, 4, 4]];
const patternNames = ["Full width", "50/50", "70/30", "30/70", "Three columns"];
function boundedWidth(value: number, pair: number) {
  return Math.max(
    Math.max(1, pair - 12),
    Math.min(Math.min(12, pair - 1), value),
  );
}
export function GridEditor({
  story,
  onChange,
  structureOnly = false,
}: {
  story: Story;
  structureOnly?: boolean;
  onChange: (story: Story) => void;
}) {
  const [baseGrid] = useState(() => initialGrid(story));
  const completeGrid = story.grid ?? baseGrid;
  const [editingContinuation, setEditingContinuation] = useState(false);
  const grid = editingContinuation
    ? { ...completeGrid, rows: completeGrid.continuation }
    : completeGrid;
  const resolveGrid = (next: GridLayout): GridLayout =>
    editingContinuation
      ? { rows: completeGrid.rows, continuation: next.rows }
      : next;
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  useEffect(() => {
    const receive = (event: Event) =>
      setMeasurements((event as CustomEvent<Record<string, string>>).detail);
    window.addEventListener("ecu-grid-measured", receive);
    return () => window.removeEventListener("ecu-grid-measured", receive);
  }, []);
  const [selected, setSelected] = useState<string | null>(null),
    [picker, setPicker] = useState<number | null>(null),
    [article, setArticle] = useState(true),
    [message, setMessage] = useState(""),
    [name, setName] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [rowOptions, setRowOptions] = useState<string | null>(null);
  const textSession = useRef<string | null>(null);
  useEffect(() => {
    const clear = (event: PointerEvent) => {
      if (
        !event
          .composedPath()
          .some(
            (node) =>
              node instanceof Element && node.matches(".layout-content-block"),
          )
      ) {
        setSelectedBlock(null);
        textSession.current = null;
      }
    };
    document.addEventListener("pointerdown", clear, true);
    return () => document.removeEventListener("pointerdown", clear, true);
  }, []);
  const [history, setHistory] = useState<Array<GridLayout | undefined>>([]),
    [future, setFuture] = useState<Array<GridLayout | undefined>>([]);
  const [savedLayouts, setSavedLayouts] = useState<LayoutPreset[] | null>(null);
  const source = useRef<{
    kind: "row" | "content" | "placement";
    id: string;
  } | null>(null);
  const resizing = useRef<{
    row: GridRow;
    left: number;
    width: number;
    index: number;
    start: number;
  } | null>(null);
  const fields = useRef<Record<string, HTMLTextAreaElement | null>>({});
  function applyFull(next: GridLayout, record = true) {
    const validated = gridSchema.safeParse(next);
    if (!validated.success) {
      setMessage(
        validated.error.issues.map((issue) => issue.message).join(" "),
      );
      return;
    }
    if (record) setHistory((previous) => [...previous, story.grid].slice(-30));
    setFuture([]);
    onChange({ ...story, grid: validated.data });
  }
  function apply(next: GridLayout, record = true) {
    applyFull(resolveGrid(next), record);
  }
  function rowChange(next: GridRow, record = true) {
    apply(
      {
        ...grid,
        rows: grid.rows.map((r) => (r.id === next.id ? next : r)),
      },
      record,
    );
  }
  function changeBlock(next: Block) {
    onChange({
      ...story,
      blocks: story.blocks.map((b) => (b.id === next.id ? next : b)),
    });
  }
  function format(block: Block, mark: string) {
    const field = fields.current[block.id];
    if (!field) return;
    const start = field.selectionStart,
      end = field.selectionEnd;
    changeBlock({
      ...block,
      text:
        block.text.slice(0, start) +
        mark +
        (block.text.slice(start, end) || "text") +
        mark +
        block.text.slice(end),
    });
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + mark.length, end + mark.length);
    });
  }
  function drag(
    event: DragEvent,
    kind: "row" | "content" | "placement",
    value: string,
  ) {
    source.current = { kind, id: value };
    event.dataTransfer.setData("application/x-ecu-grid", value);
    event.dataTransfer.effectAllowed = "move";
    event.stopPropagation();
  }
  function dropRow(event: DragEvent, row: GridRow) {
    event.preventDefault();
    const from = source.current;
    if (from?.kind !== "row") return;
    const rows = [...grid.rows];
    const index = rows.findIndex((r) => r.id === from.id),
      to = rows.findIndex((r) => r.id === row.id);
    if (index < 0 || to < 0) return;
    const [moved] = rows.splice(index, 1);
    rows.splice(to, 0, moved);
    apply({ ...grid, rows });
    source.current = null;
  }
  function add(at: number, widths: number[]) {
    const row = makeRow(widths);
    if (!editingContinuation)
      row.cells.forEach((c) => {
        c.flow = false;
      });
    apply({
      ...grid,
      rows: [...grid.rows.slice(0, at), row, ...grid.rows.slice(at)],
    });
    setSelected(row.id);
    setPicker(null);
  }
  function insert(at: number) {
    return (
      <div className="grid-insert" key={"insert-" + at}>
        <button
          className="icon-button"
          disabled={grid.rows.length >= (editingContinuation ? 12 : 60)}
          aria-label={"Insert layout " + (at + 1)}
          onClick={() => setPicker(picker === at ? null : at)}
        >
          <Plus size={16} />
        </button>
        {picker === at && (
          <div
            className="grid-layout-picker"
            role="group"
            aria-label="Choose row layout"
          >
            {patterns.map((widths, patternIndex) => (
              <button
                key={widths.join()}
                aria-label={"Layout " + patternNames[patternIndex]}
                title={patternNames[patternIndex]}
                onClick={() => add(at, widths)}
              >
                <span
                  className="layout-diagram"
                  style={{
                    gridTemplateColumns: widths.map((w) => w + "fr").join(" "),
                  }}
                >
                  {widths.map((_, i) => (
                    <i key={i} />
                  ))}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <section
      className={
        "visual-grid-editor" + (structureOnly ? " basic-grid-editor" : "")
      }
      aria-label="Visual Grid Editor"
    >
      <div
        className="grid-page-variants"
        role="group"
        aria-label="Page layout variant"
      >
        <button
          className="text-button"
          aria-pressed={!editingContinuation}
          onClick={() => {
            setEditingContinuation(false);
            setSelected(null);
            setSelectedBlock(null);
            setRowOptions(null);
          }}
        >
          {structureOnly ? "Opening Page" : "Opening layout"}
        </button>
        <button
          className="text-button"
          aria-pressed={editingContinuation}
          onClick={() => {
            setEditingContinuation(true);
            setSelected(null);
          }}
        >
          {structureOnly ? "Continuation Page" : "Continuation layout"}
        </button>
      </div>
      {!editingContinuation && (
        <div className="opening-page-fields" aria-label="Opening Page fields">
          {(
            [
              ["title", "Headline", 200],
              ["subtitle", "Subheadline", 500],
              ["byline", "Author", 150],
            ] as const
          ).map(([field, label, maxLength]) => (
            <label key={field}>
              {label} on Opening Page
              <input
                aria-label={`${label} on Opening Page`}
                value={story.openingFields?.[field] ?? story[field]}
                maxLength={maxLength}
                onChange={(event) =>
                  onChange({
                    ...story,
                    openingFields: {
                      ...story.openingFields,
                      [field]: event.target.value,
                    },
                  })
                }
              />
              {story.openingFields?.[field] !== undefined && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    const fields = { ...story.openingFields };
                    delete fields[field];
                    onChange({ ...story, openingFields: fields });
                  }}
                >
                  Use story {label.toLowerCase()}
                </button>
              )}
            </label>
          ))}
        </div>
      )}
      <div className="grid-editor-header">
        <h3>Page Layout Builder</h3>
        <div>
          <button
            className="icon-button"
            aria-label="Undo layout"
            disabled={!history.length}
            onClick={() => {
              textSession.current = null;
              const previous = history.at(-1);
              setHistory(history.slice(0, -1));
              setFuture([...future, story.grid]);
              onChange({ ...story, grid: previous });
            }}
          >
            <Undo2 size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Redo layout"
            disabled={!future.length}
            onClick={() => {
              textSession.current = null;
              setHistory([...history, story.grid]);
              setFuture(future.slice(0, -1));
              onChange({ ...story, grid: future.at(-1) });
            }}
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>
      {!story.grid && (
        <p className="helper">
          Your approved layout is active. Arrange the rows below to apply a
          custom grid. Story text stays in Article content.
        </p>
      )}
      {story.grid && (
        <button
          className="text-button"
          onClick={() => {
            const hasManual = [
              ...completeGrid.rows,
              ...completeGrid.continuation,
            ].some((r) =>
              r.cells.some((c) => c.blocks?.some((b) => b.kind === "manual")),
            );
            if (
              hasManual &&
              !confirm(
                "Switch to the approved template? Manual layout blocks will be removed. Official story fields and Article Content will be kept. You can undo this before leaving.",
              )
            )
              return;
            setHistory([...history, story.grid]);
            onChange({ ...story, grid: undefined });
          }}
        >
          Use approved template layout
        </button>
      )}
      <div className="grid-canvas">
        {grid.rows.map((row, index) => (
          <div key={row.id}>
            {insert(index)}
            <div
              className={
                "visual-grid-row" + (selected === row.id ? " selected" : "")
              }
              data-grid-row={row.id}
              onClick={() => setSelected(row.id)}
              onFocus={() => setSelected(row.id)}
              onDragEnd={() => {
                source.current = null;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => dropRow(e, row)}
            >
              <div className="grid-row-actions">
                <button
                  className="icon-button"
                  aria-label={"Row options " + (index + 1)}
                  title="Row options"
                  aria-expanded={rowOptions === row.id}
                  onClick={() =>
                    setRowOptions(rowOptions === row.id ? null : row.id)
                  }
                >
                  <SlidersHorizontal size={15} />
                </button>
                <button
                  className="icon-button"
                  draggable
                  onDragStart={(e) => drag(e, "row", row.id)}
                  aria-label={"Drag layout " + (index + 1)}
                >
                  <GripVertical size={16} />
                </button>
                <details>
                  <summary aria-label={"Layout actions " + (index + 1)}>
                    <MoreHorizontal size={17} />
                  </summary>
                  <div
                    className="grid-row-menu"
                    onClick={(event) => {
                      const menu = event.currentTarget.closest("details");
                      if (menu) menu.open = false;
                    }}
                  >
                    <button
                      onClick={() => {
                        const copy = {
                          ...row,
                          id: id(),
                          cells: row.cells.map((c) => ({
                            ...c,
                            id: id(),
                            contentIds: [],
                            blocks: c.blocks?.map((b) => ({ ...b, id: id() })),
                          })),
                        };
                        apply({
                          ...grid,
                          rows: [
                            ...grid.rows.slice(0, index + 1),
                            copy,
                            ...grid.rows.slice(index + 1),
                          ],
                        });
                      }}
                    >
                      Duplicate layout
                    </button>
                    <button
                      disabled={index === 0}
                      onClick={() => {
                        const rows = [...grid.rows];
                        [rows[index - 1], rows[index]] = [
                          rows[index],
                          rows[index - 1],
                        ];
                        apply({ ...grid, rows });
                      }}
                    >
                      Move up
                    </button>
                    <button
                      disabled={index === grid.rows.length - 1}
                      onClick={() => {
                        const rows = [...grid.rows];
                        [rows[index + 1], rows[index]] = [
                          rows[index],
                          rows[index + 1],
                        ];
                        apply({ ...grid, rows });
                      }}
                    >
                      Move down
                    </button>
                    <button
                      disabled={
                        structureOnly &&
                        row.cells.some(
                          (c) =>
                            c.contentIds.length > 0 ||
                            Boolean(c.blocks?.length),
                        )
                      }
                      title={
                        structureOnly &&
                        row.cells.some(
                          (c) =>
                            c.contentIds.length > 0 ||
                            Boolean(c.blocks?.length),
                        )
                          ? "Saved content is hidden. This row is protected from deletion."
                          : undefined
                      }
                      onClick={() => {
                        if (
                          confirm(
                            "Remove this layout row and its manual blocks? Official story fields and Article Content will be kept.",
                          )
                        )
                          apply(detachRow(grid, row.id));
                      }}
                    >
                      Remove layout
                    </button>
                  </div>
                </details>
              </div>
              <div
                className="visual-grid-cells"
                style={{
                  gridTemplateColumns: row.cells
                    .map((c) => c.width + "fr")
                    .join(" "),
                  gap: Math.min(row.gapMm, 8) + "px",
                }}
              >
                {row.cells.map((cell, ci) => (
                  <div
                    key={cell.id}
                    className="visual-grid-cell"
                    data-grid-cell={cell.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      if (source.current?.kind === "row") return;
                      e.stopPropagation();
                      e.preventDefault();
                      if (source.current?.kind === "placement") {
                        applyFull(
                          moveLayoutBlock(
                            completeGrid,
                            source.current.id,
                            cell.id,
                          ),
                        );
                        source.current = null;
                        return;
                      }
                      if (source.current?.kind === "content") {
                        if (editingContinuation) {
                          setMessage(
                            "Use linked text cells on continuation layouts; article content flows into them without repeating.",
                          );
                          return;
                        }
                        const content = story.blocks.find(
                          (b) => b.id === source.current!.id,
                        );
                        const moved = moveContent(
                          grid,
                          source.current.id,
                          cell.id,
                        );
                        apply({
                          ...moved,
                          rows: moved.rows.map((r) => ({
                            ...r,
                            cells: r.cells.map((c) =>
                              c.id === cell.id
                                ? { ...c, contentType: content?.type }
                                : c,
                            ),
                          })),
                        });
                      }
                    }}
                  >
                    {cell.flow &&
                      !cell.blocks?.some(
                        (b) => b.kind === "linked" && b.source === "article",
                      ) && (
                        <button
                          className="linked-article"
                          onClick={() => {
                            setArticle(true);
                            requestAnimationFrame(() =>
                              fields.current[story.blocks[0]?.id]?.focus(),
                            );
                          }}
                        >
                          <small>↳ Linked article</small>
                          <span className="grid-cell-excerpt">
                            {measurements[cell.id] ||
                              (!story.grid
                                ? story.blocks
                                    .find((b) => b.type === "paragraph")
                                    ?.text.slice(0, 240)
                                : "Text continues here when needed.")}
                          </span>
                        </button>
                      )}
                    {cell.contentIds.map((contentId) => {
                      const block = story.blocks.find(
                        (b) => b.id === contentId,
                      );
                      return block ? (
                        <button
                          className="cell-content"
                          key={contentId}
                          draggable
                          onDragStart={(e) => drag(e, "content", contentId)}
                          onClick={() => {
                            setArticle(true);
                            requestAnimationFrame(() =>
                              fields.current[contentId]?.focus(),
                            );
                          }}
                        >
                          {block.type === "figure" ? (
                            <GridImage
                              key={block.image?.assetId ?? "missing"}
                              block={block}
                            />
                          ) : (
                            block.text.slice(0, 150) || block.type
                          )}
                        </button>
                      ) : null;
                    })}
                    <LayoutCellContent
                      blocks={cell.blocks ?? []}
                      story={story}
                      selected={selectedBlock}
                      onSelect={setSelectedBlock}
                      onStoryChange={onChange}
                      onTextEnd={() => {
                        textSession.current = null;
                      }}
                      onChange={(blocks, textEditKey) => {
                        const record =
                          !textEditKey || textSession.current !== textEditKey;
                        rowChange(
                          {
                            ...row,
                            cells: row.cells.map((c) =>
                              c.id === cell.id
                                ? {
                                    ...c,
                                    blocks,
                                    flow:
                                      blocks.some(
                                        (b) =>
                                          b.kind === "linked" &&
                                          b.source === "article",
                                      ) ||
                                      (c.flow &&
                                        !(c.blocks ?? []).some(
                                          (b) =>
                                            b.kind === "linked" &&
                                            b.source === "article",
                                        )),
                                  }
                                : c,
                            ),
                          },
                          record,
                        );
                        textSession.current = textEditKey ?? null;
                      }}
                      onDrag={(e, blockId) => drag(e, "placement", blockId)}
                      canDrop={() => source.current?.kind === "placement"}
                      onDrop={(e, beforeId) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (source.current?.kind === "placement")
                          applyFull(
                            moveLayoutBlock(
                              completeGrid,
                              source.current.id,
                              cell.id,
                              beforeId,
                            ),
                          );
                        source.current = null;
                      }}
                    />
                    {ci < row.cells.length - 1 && (
                      <div
                        role="separator"
                        aria-label={"Resize grid columns " + (ci + 1)}
                        aria-orientation="vertical"
                        aria-valuemin={1}
                        aria-valuemax={12}
                        aria-valuenow={Math.round(cell.width)}
                        tabIndex={0}
                        className="grid-column-divider"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          const rect =
                            e.currentTarget.parentElement!.parentElement!.getBoundingClientRect();
                          resizing.current = {
                            row,
                            left: rect.left,
                            width: rect.width,
                            index: ci,
                            start: e.clientX,
                          };
                          setHistory((h) => [...h, story.grid]);
                        }}
                        onPointerMove={(e) => {
                          const state = resizing.current;
                          if (
                            !state ||
                            !e.currentTarget.hasPointerCapture(e.pointerId)
                          )
                            return;
                          const widths = state.row.cells.map((c) => c.width);
                          const sum = widths.reduce((a, b) => a + b, 0),
                            pair = widths[ci] + widths[ci + 1];
                          const value = boundedWidth(
                            widths[ci] +
                              ((e.clientX - state.start) / state.width) * sum,
                            pair,
                          );
                          widths[ci] = value;
                          widths[ci + 1] = pair - value;
                          onChange({
                            ...story,
                            grid: resolveGrid({
                              ...grid,
                              rows: grid.rows.map((r) =>
                                r.id === row.id ? resizeRow(r, widths) : r,
                              ),
                            }),
                          });
                        }}
                        onPointerUp={(e) => {
                          resizing.current = null;
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        }}
                        onKeyDown={(e) => {
                          if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
                            e.preventDefault();
                            const widths = row.cells.map((c) => c.width),
                              pair = widths[ci] + widths[ci + 1];
                            widths[ci] = boundedWidth(
                              widths[ci] + (e.key === "ArrowLeft" ? -0.5 : 0.5),
                              pair,
                            );
                            widths[ci + 1] = pair - widths[ci];
                            rowChange(resizeRow(row, widths));
                          }
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
              {selected === row.id && rowOptions === row.id && (
                <div
                  className="grid-row-settings"
                  role="region"
                  aria-label="Row options"
                >
                  <div className="settings-grid">
                    <div className="grid-flow-options">
                      {row.cells.map((c, ci) => (
                        <button
                          key={c.id}
                          className="text-button"
                          aria-pressed={c.flow}
                          disabled={c.blocks?.some(
                            (b) =>
                              b.kind === "linked" && b.source === "article",
                          )}
                          onClick={() =>
                            rowChange({
                              ...row,
                              cells: row.cells.map((current) =>
                                current.id === c.id
                                  ? { ...current, flow: !current.flow }
                                  : current,
                              ),
                            })
                          }
                        >
                          {"Continue article in column " + (ci + 1)}
                        </button>
                      ))}
                    </div>
                    <label>
                      Columns
                      <select
                        aria-label="Row columns"
                        value={row.cells.length}
                        onChange={(e) =>
                          rowChange(
                            resizeRow(
                              row,
                              Array.from(
                                { length: Number(e.target.value) },
                                () => 12 / Number(e.target.value),
                              ),
                            ),
                          )
                        }
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Height
                      <select
                        value={row.heightMode}
                        onChange={(e) =>
                          rowChange({
                            ...row,
                            heightMode: e.target.value as GridRow["heightMode"],
                          })
                        }
                      >
                        <option value="auto">Auto</option>
                        <option value="min">Minimum</option>
                        <option value="fixed">Fixed</option>
                      </select>
                    </label>
                    {row.heightMode !== "auto" && (
                      <label>
                        Height (mm)
                        <input
                          aria-label="Row height"
                          type="number"
                          min={10}
                          max={240}
                          value={row.heightMm}
                          onChange={(e) =>
                            rowChange({
                              ...row,
                              heightMm: Math.max(
                                10,
                                Math.min(240, Number(e.target.value)),
                              ),
                            })
                          }
                        />
                      </label>
                    )}
                    {(["paddingMm", "gapMm"] as const).map((key) => (
                      <label key={key}>
                        {key === "paddingMm" ? "Padding (mm)" : "Spacing (mm)"}
                        <input
                          type="number"
                          min={0}
                          max={15}
                          value={row[key]}
                          onChange={(e) =>
                            rowChange({
                              ...row,
                              [key]: Math.max(
                                0,
                                Math.min(15, Number(e.target.value)),
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                    <label>
                      Vertical alignment
                      <select
                        value={row.align}
                        onChange={(e) =>
                          rowChange({
                            ...row,
                            align: e.target.value as GridRow["align"],
                          })
                        }
                      >
                        <option value="start">Top</option>
                        <option value="center">Center</option>
                        <option value="end">Bottom</option>
                      </select>
                    </label>
                    {row.cells.map((cell, ci) => (
                      <label key={cell.id}>
                        Column {ci + 1} width
                        <input
                          type="number"
                          min={1}
                          max={12}
                          step={0.5}
                          value={cell.width}
                          onChange={(e) =>
                            rowChange({
                              ...row,
                              cells: row.cells.map((c) =>
                                c.id === cell.id
                                  ? {
                                      ...c,
                                      width: Math.max(
                                        1,
                                        Math.min(12, Number(e.target.value)),
                                      ),
                                    }
                                  : c,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                    {row.cells
                      .filter(
                        (c) =>
                          c.contentType === "figure" ||
                          c.contentIds.some(
                            (value) =>
                              story.blocks.find((b) => b.id === value)?.type ===
                              "figure",
                          ),
                      )
                      .map((cell) => (
                        <div key={cell.id}>
                          <label>
                            Image height (mm)
                            <input
                              type="number"
                              min={20}
                              max={180}
                              value={cell.imageHeightMm ?? 70}
                              onChange={(e) =>
                                rowChange({
                                  ...row,
                                  cells: row.cells.map((c) =>
                                    c.id === cell.id
                                      ? {
                                          ...c,
                                          imageHeightMm: Math.max(
                                            20,
                                            Math.min(
                                              180,
                                              Number(e.target.value),
                                            ),
                                          ),
                                        }
                                      : c,
                                  ),
                                })
                              }
                            />
                          </label>
                          <label>
                            Image fit
                            <select
                              value={cell.imageFit ?? "cover"}
                              onChange={(e) =>
                                rowChange({
                                  ...row,
                                  cells: row.cells.map((c) =>
                                    c.id === cell.id
                                      ? {
                                          ...c,
                                          imageFit: e.target.value as
                                            "cover" | "contain",
                                        }
                                      : c,
                                  ),
                                })
                              }
                            >
                              <option value="cover">Fill and crop</option>
                              <option value="contain">
                                Show complete image
                              </option>
                            </select>
                          </label>
                        </div>
                      ))}
                    <label>
                      <input
                        type="checkbox"
                        checked={row.keepTogether}
                        onChange={(e) =>
                          rowChange({ ...row, keepTogether: e.target.checked })
                        }
                      />
                      Keep together
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={row.breakBefore}
                        onChange={(e) =>
                          rowChange({ ...row, breakBefore: e.target.checked })
                        }
                      />
                      Start on a new page
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {insert(grid.rows.length)}
      </div>
      <details className="grid-presets">
        <summary>Saved layouts & continuation</summary>
        <label>
          Layout name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
        </label>
        <button
          className="button secondary"
          onClick={() => {
            try {
              savePreset(name, completeGrid);
              setMessage("Layout saved in this browser.");
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Unable to save layout.",
              );
            }
          }}
        >
          Save layout preset
        </button>
        <button
          className="button secondary"
          onClick={() => {
            try {
              const presets = loadPresets();
              if (!presets.length) {
                setMessage("No saved layouts yet.");
                return;
              }
              setSavedLayouts(presets);
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Unable to load layouts.",
              );
            }
          }}
        >
          Use saved layout
        </button>
        {savedLayouts && (
          <div className="grid-preset-choices">
            {savedLayouts.map((preset) => (
              <button
                key={preset.id}
                className="button secondary"
                onClick={() => {
                  applyFull(applyPreset(preset.grid, story));
                  setSavedLayouts(null);
                  setMessage(
                    "Layout applied; all existing content is retained.",
                  );
                }}
              >
                <span
                  className="layout-diagram"
                  aria-hidden="true"
                  style={{
                    gridTemplateColumns: preset.grid.rows[0].cells
                      .map((c) => c.width + "fr")
                      .join(" "),
                  }}
                >
                  {preset.grid.rows[0].cells.map((c) => (
                    <i key={c.id} />
                  ))}
                </span>
                {preset.name}
              </button>
            ))}
          </div>
        )}
        <p className="helper">
          Continuation pages keep the approved page furniture and do not repeat
          the opening hero.
        </p>
        <button
          className="text-button"
          onClick={() => {
            setEditingContinuation(true);
            setSelected(null);
          }}
        >
          Edit continuation layout
        </button>
      </details>
      <p role="status" className="helper">
        {message}
      </p>
      <button
        className="text-button"
        aria-expanded={article}
        onClick={() => setArticle(!article)}
      >
        Article content
      </button>
      {article && (
        <div className="grid-article-content">
          <p className="helper">
            Edit the original content here. Linked cells flow from this article
            automatically; drag a piece into a cell for independent placement.
          </p>
          {story.blocks.map((block, i) => (
            <div
              className="grid-source-entry"
              key={block.id}
              draggable
              onDragStart={(e) => drag(e, "content", block.id)}
            >
              <div className="grid-source-tools">
                <button
                  className="icon-button"
                  draggable
                  aria-label={"Drag content " + (i + 1)}
                  onDragStart={(event) => drag(event, "content", block.id)}
                >
                  <GripVertical size={15} />
                </button>
                <label>
                  <span className="sr-only">Block {i + 1} type</span>
                  <select
                    value={block.type}
                    onChange={(e) =>
                      changeBlock({
                        ...block,
                        type: e.target.value as Block["type"],
                      })
                    }
                  >
                    {[
                      "paragraph",
                      "heading",
                      "figure",
                      "quote",
                      "list",
                      "callout",
                      "caption",
                    ].map((type) => (
                      <option value={type} key={type}>
                        {type === "figure" ? "Image" : type}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="icon-button"
                  aria-label={"Bold in block " + (i + 1)}
                  onClick={() => format(block, "**")}
                >
                  <Bold size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={"Italic in block " + (i + 1)}
                  onClick={() => format(block, "*")}
                >
                  <Italic size={15} />
                </button>
              </div>
              {block.type === "figure" && (
                <>
                  <MediaPicker
                    label={"Image in block " + (i + 1)}
                    value={block.image}
                    onChange={(image) => changeBlock({ ...block, image })}
                  />
                  <label>
                    Image {i + 1} height (mm)
                    <input
                      type="number"
                      min={20}
                      max={180}
                      value={block.figureHeightMm ?? 70}
                      onChange={(e) =>
                        changeBlock({
                          ...block,
                          figureHeightMm: Math.max(
                            20,
                            Math.min(180, Number(e.target.value)),
                          ),
                        })
                      }
                    />
                  </label>
                </>
              )}
              <textarea
                aria-label={"Block " + (i + 1) + " text"}
                value={block.text}
                maxLength={20000}
                rows={block.type === "paragraph" ? 5 : 2}
                ref={(el) => {
                  fields.current[block.id] = el;
                }}
                onChange={(e) =>
                  changeBlock({ ...block, text: e.target.value })
                }
              />
              <details className="grid-source-actions">
                <summary>Content options</summary>
                <button
                  onClick={() => {
                    if (i === 0) return;
                    const blocks = [...story.blocks];
                    [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]];
                    onChange({ ...story, blocks });
                  }}
                >
                  Move up
                </button>
                <button
                  onClick={() => {
                    if (i === story.blocks.length - 1) return;
                    const blocks = [...story.blocks];
                    [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]];
                    onChange({ ...story, blocks });
                  }}
                >
                  Move down
                </button>
                <button
                  onClick={() => {
                    if (!confirm("Remove this content from the article?"))
                      return;
                    const nextGrid = story.grid
                      ? {
                          ...story.grid,
                          rows: story.grid.rows.map((r) => ({
                            ...r,
                            cells: r.cells.map((c) => ({
                              ...c,
                              contentIds: c.contentIds.filter(
                                (value) => value !== block.id,
                              ),
                            })),
                          })),
                        }
                      : undefined;
                    onChange({
                      ...story,
                      blocks: story.blocks.filter((b) => b.id !== block.id),
                      grid: nextGrid,
                    });
                  }}
                >
                  Remove content
                </button>
              </details>
            </div>
          ))}
          <button
            className="button secondary"
            disabled={story.blocks.length >= 100}
            onClick={() =>
              onChange({
                ...story,
                blocks: [
                  ...story.blocks,
                  { id: id(), type: "paragraph", text: "" },
                ],
              })
            }
          >
            <Plus size={15} />
            Add content block
          </button>
        </div>
      )}
    </section>
  );
}
