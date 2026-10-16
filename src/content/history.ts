import type { Story } from "../domain/issue";
export type BodySnapshot = {
  blocks: Story["blocks"];
  contentMode?: Story["contentMode"];
  references: Record<string, string[]>;
};
export function bodySnapshot(story: Story): BodySnapshot {
  return structuredClone({
    blocks: story.blocks,
    contentMode: story.contentMode,
    references: Object.fromEntries(
      story.grid?.rows.flatMap((row) =>
        row.cells.map((cell) => [cell.id, cell.contentIds]),
      ) ?? [],
    ),
  });
}
/** Undo only body edits. Keep later manual layout/theme changes; restore surviving cell bindings safely. */
export function restoreBody(story: Story, snapshot: BodySnapshot): Story {
  const ids = new Set(snapshot.blocks.map((block) => block.id));
  const assigned = new Set(
    story.grid?.rows.flatMap((row) =>
      row.cells.flatMap((cell) => cell.contentIds.filter((id) => ids.has(id))),
    ) ?? [],
  );
  const grid = story.grid
    ? {
        ...story.grid,
        rows: story.grid.rows.map((row) => ({
          ...row,
          cells: row.cells.map((cell) => {
            const recovered = (snapshot.references[cell.id] ?? []).filter(
              (id) => ids.has(id) && !assigned.has(id),
            );
            recovered.forEach((id) => assigned.add(id));
            return {
              ...cell,
              contentIds: [
                ...cell.contentIds.filter((id) => ids.has(id)),
                ...recovered,
              ],
            };
          }),
        })),
      }
    : undefined;
  return {
    ...story,
    blocks: structuredClone(snapshot.blocks),
    contentMode: snapshot.contentMode,
    ...(grid ? { grid } : {}),
  };
}
