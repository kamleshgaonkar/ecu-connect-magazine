import {
  gridSchema,
  makeRow,
  type GridLayout,
  type GridRow,
} from "../domain/grid";
import type { Story } from "../domain/issue";
export function initialGrid(story: Story): GridLayout {
  const row = makeRow();
  const figures = story.blocks.filter((b) => b.type === "figure");
  if (figures.length) {
    row.cells = [
      { ...row.cells[0], width: 7 },
      {
        id: crypto.randomUUID(),
        width: 5,
        flow: false,
        contentIds: [figures[0].id],
        contentType: "figure",
      },
    ];
  }
  return { rows: [row], continuation: [makeRow()] };
}
export function resizeRow(row: GridRow, widths: number[]): GridRow {
  const all = row.cells.flatMap((c) => c.contentIds);
  return {
    ...row,
    cells: widths.map((width, i) => ({
      ...row.cells[i],
      id: row.cells[i]?.id ?? crypto.randomUUID(),
      width,
      flow:
        (row.cells[i]?.flow ?? false) ||
        (i === 0 &&
          row.cells
            .slice(widths.length)
            .some((c) =>
              (c.blocks ?? []).some(
                (b) => b.kind === "linked" && b.source === "article",
              ),
            )),
      blocks:
        i === 0
          ? [
              ...(row.cells[0]?.blocks ?? []),
              ...row.cells.slice(widths.length).flatMap((c) => c.blocks ?? []),
            ]
          : row.cells[i]?.blocks,
      contentIds:
        i === 0
          ? all.filter(
              (id) =>
                !row.cells
                  .slice(1, widths.length)
                  .some((c) => c.contentIds.includes(id)),
            )
          : (row.cells[i]?.contentIds ?? []),
    })),
  };
}
export function detachRow(grid: GridLayout, id: string): GridLayout {
  const rows = grid.rows.filter((r) => r.id !== id);
  return { ...grid, rows: rows.length ? rows : [makeRow()] }; // Canonical blocks are never removed.
}
export function moveContent(
  grid: GridLayout,
  contentId: string,
  cellId: string,
): GridLayout {
  return {
    ...grid,
    rows: grid.rows.map((r) => ({
      ...r,
      cells: r.cells.map((c) => ({
        ...c,
        contentIds:
          c.id === cellId
            ? [...c.contentIds.filter((id) => id !== contentId), contentId]
            : c.contentIds.filter((id) => id !== contentId),
      })),
    })),
  };
}
export function reusableGrid(grid: GridLayout): GridLayout {
  const clean = (rows: GridRow[]) =>
    rows.map((r) => ({
      ...r,
      cells: r.cells.map((c) => ({
        ...c,
        contentIds: [],
        blocks: c.blocks?.filter((b) => b.kind === "linked"),
      })),
    }));
  return {
    ...grid,
    rows: clean(grid.rows),
    continuation: clean(grid.continuation),
  };
}
export function instantiateGrid(grid: GridLayout): GridLayout {
  const copy = (r: GridRow) => ({
    ...r,
    id: crypto.randomUUID(),
    cells: r.cells.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      contentIds: [],
      blocks: c.blocks?.map((b) => ({ ...b, id: crypto.randomUUID() })),
    })),
  });
  return gridSchema.parse({
    rows: grid.rows.map(copy),
    continuation: grid.continuation.map(copy),
  });
}
export type LayoutPreset = { id: string; name: string; grid: GridLayout };
const presetKey = "ecu-connect:grid-presets:v1";
export function loadPresets(): LayoutPreset[] {
  const value = JSON.parse(localStorage.getItem(presetKey) ?? "[]");
  if (!Array.isArray(value))
    throw Error(
      "Saved layouts are invalid; stored layouts have not been changed.",
    );
  return value.map((p) => ({
    id: String(p.id),
    name: String(p.name),
    grid: gridSchema.parse(p.grid),
  }));
}
export function savePreset(name: string, grid: GridLayout) {
  const existing = loadPresets();
  const preset = {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 80),
    grid: reusableGrid(grid),
  };
  if (!preset.name) throw Error("Enter a layout name.");
  localStorage.setItem(presetKey, JSON.stringify([...existing, preset]));
  return preset;
}

export function applyPreset(grid: GridLayout, story: Story): GridLayout {
  const layout = instantiateGrid(grid),
    used = new Set<string>();
  layout.rows = layout.rows.map((row) => ({
    ...row,
    cells: row.cells.map((cell) => {
      if (!cell.contentType) return cell;
      const block = story.blocks.find(
        (b) => b.type === cell.contentType && !used.has(b.id),
      );
      if (!block) return cell;
      used.add(block.id);
      return { ...cell, contentIds: [block.id] };
    }),
  }));
  return layout;
}

/** Move a placement without touching canonical story data. */
export function moveLayoutBlock(
  grid: GridLayout,
  blockId: string,
  cellId: string,
  beforeId?: string,
): GridLayout {
  if (beforeId === blockId) return grid;
  const all = [...grid.rows, ...grid.continuation];
  const block = all
    .flatMap((r) => r.cells.flatMap((c) => c.blocks ?? []))
    .find((b) => b.id === blockId);
  if (!block || !all.some((r) => r.cells.some((c) => c.id === cellId)))
    return grid;
  const move = (rows: GridRow[]) =>
    rows.map((r) => ({
      ...r,
      cells: r.cells.map((c) => {
        const blocks = (c.blocks ?? []).filter((b) => b.id !== blockId);
        if (c.id === cellId) {
          const at = blocks.findIndex((b) => b.id === beforeId);
          blocks.splice(at < 0 ? blocks.length : at, 0, block);
        }
        return {
          ...c,
          blocks,
          flow:
            blocks.some((b) => b.kind === "linked" && b.source === "article") ||
            (c.flow &&
              !(c.blocks ?? []).some(
                (b) => b.kind === "linked" && b.source === "article",
              )),
        };
      }),
    }));
  return {
    ...grid,
    rows: move(grid.rows),
    continuation: move(grid.continuation),
  };
}
