"use client";
import { useState } from "react";
import type { Block } from "../domain/issue";
import {
  componentText,
  newTableCell,
  safeLink,
  type EditorialComponent,
} from "../domain/content";
import { MediaPicker } from "./media-picker";
import { RichTextInput } from "./rich-text-input";
export function EditorialComponentSettings({
  block,
  onChange,
}: {
  block: Block;
  onChange: (block: Block) => void;
}) {
  const component = block.component!;
  const [cellId, setCellId] = useState<string | undefined>(
    component.kind === "table" ? component.rows[0].cells[0].id : undefined,
  );
  const [linkDraft, setLinkDraft] = useState(
    component.kind === "cta" ? (component.href ?? "") : "",
  );
  const [error, setError] = useState("");
  function update(value: EditorialComponent) {
    onChange({ ...block, component: value, text: componentText(value) });
  }
  const field = (
    label: string,
    value: string,
    change: (text: string) => void,
    multiline = false,
  ) => (
    <label>
      {label}
      {multiline ? (
        <textarea
          rows={3}
          aria-label={label}
          maxLength={20000}
          value={value}
          onChange={(event) => change(event.target.value)}
        />
      ) : (
        <input
          value={value}
          aria-label={label}
          maxLength={
            label === "Person name" || label === "Link label"
              ? 150
              : label === "Designation" || label === "Company / location"
                ? 200
                : 300
          }
          onChange={(event) => change(event.target.value)}
        />
      )}
    </label>
  );
  const colour = (
    label: string,
    value: string,
    change: (colour: string) => void,
  ) => (
    <label>
      {label}
      <input
        type="color"
        value={value}
        onChange={(event) => change(event.target.value)}
      />
    </label>
  );
  return (
    <div className="editorial-component-options">
      <label>
        Component width (%)
        <input
          type="range"
          min={25}
          max={100}
          value={
            block.widthPercent ?? (component.kind === "profile" ? 34 : 100)
          }
          onChange={(e) =>
            onChange({ ...block, widthPercent: Number(e.target.value) })
          }
        />
      </label>
      {component.kind === "table" &&
        (() => {
          let rowIndex = component.rows.findIndex((row) =>
            row.cells.some((cell) => cell.id === cellId),
          );
          if (rowIndex < 0) rowIndex = 0;
          const column = Math.max(
            0,
            component.rows[rowIndex].cells.findIndex(
              (cell) => cell.id === cellId,
            ),
          );
          const cell = component.rows[rowIndex].cells[column];
          const changeCell = (patch: Partial<typeof cell>) =>
            update({
              ...component,
              rows: component.rows.map((row) => ({
                ...row,
                cells: row.cells.map((item) =>
                  item.id === cell.id ? { ...item, ...patch } : item,
                ),
              })),
            });
          return (
            <>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={component.header}
                  onChange={(e) =>
                    update({ ...component, header: e.target.checked })
                  }
                />
                Table header row
              </label>
              <div
                className="component-table-grid"
                role="group"
                aria-label="Select table cell"
              >
                {component.rows.map((row, r) => (
                  <div key={row.id}>
                    {row.cells.map((item, c) => (
                      <button
                        type="button"
                        className="text-button"
                        key={item.id}
                        aria-pressed={item.id === cell.id}
                        aria-label={`Cell ${r + 1}, ${c + 1}`}
                        onClick={() => setCellId(item.id)}
                      >
                        {item.content.runs.map((run) => run.text).join("") ||
                          "Empty cell"}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <RichTextInput
                key={cell.id}
                label="Cell text"
                value={cell.content}
                onChange={(content) => changeCell({ content })}
              />
              <div className="inline-actions">
                <button
                  type="button"
                  className="text-button"
                  disabled={component.rows.length >= 500}
                  onClick={() => {
                    const rows = [...component.rows];
                    rows.splice(rowIndex + 1, 0, {
                      id: crypto.randomUUID(),
                      cells: component.rows[0].cells.map(newTableCell),
                    });
                    update({ ...component, rows });
                  }}
                >
                  Add row
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={component.rows.length <= 1}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Remove this table row and its cell content?",
                      )
                    )
                      update({
                        ...component,
                        rows: component.rows.filter(
                          (_, index) => index !== rowIndex,
                        ),
                      });
                  }}
                >
                  Remove row
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={component.rows[0].cells.length >= 12}
                  onClick={() =>
                    update({
                      ...component,
                      rows: component.rows.map((row) => {
                        const cells = [...row.cells];
                        cells.splice(column + 1, 0, newTableCell());
                        return { ...row, cells };
                      }),
                    })
                  }
                >
                  Add column
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={component.rows[0].cells.length <= 1}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Remove this table column and its cell content?",
                      )
                    )
                      update({
                        ...component,
                        rows: component.rows.map((row) => ({
                          ...row,
                          cells: row.cells.filter(
                            (_, index) => index !== column,
                          ),
                        })),
                      });
                  }}
                >
                  Remove column
                </button>
              </div>
              {colour(
                "Cell background",
                cell.background ?? component.background,
                (background) => changeCell({ background }),
              )}
              {colour(
                "Cell text colour",
                cell.colour ??
                  (component.header && rowIndex === 0 ? "#FFFFFF" : "#1E1E1E"),
                (colour) => changeCell({ colour }),
              )}
              {colour("Table background", component.background, (background) =>
                update({ ...component, background }),
              )}
              {colour(
                "Table header background",
                component.headerBackground,
                (headerBackground) =>
                  update({ ...component, headerBackground }),
              )}
              {colour(
                "Table border colour",
                component.borderColour,
                (borderColour) => update({ ...component, borderColour }),
              )}
              <label>
                Table border width (pt)
                <input
                  type="number"
                  min={0}
                  max={3}
                  step={0.25}
                  value={component.borderWidth}
                  onChange={(e) =>
                    update({
                      ...component,
                      borderWidth: Math.max(
                        0,
                        Math.min(3, Number(e.target.value)),
                      ),
                    })
                  }
                />
              </label>
            </>
          );
        })()}
      {(component.kind === "profile" || component.kind === "testimonial") && (
        <>
          {component.kind === "testimonial" && (
            <>
              <label>
                Quote preset
                <select
                  aria-label="Quote preset"
                  value={component.preset}
                  onChange={(e) =>
                    onChange({
                      ...block,
                      component: {
                        ...component,
                        preset: e.target.value as "compact" | "executive",
                      },
                      ...(block.image
                        ? {
                            image: {
                              ...block.image,
                              fit:
                                e.target.value === "executive"
                                  ? "contain"
                                  : "cover",
                            },
                          }
                        : {}),
                    })
                  }
                >
                  <option value="executive">Executive Quote</option>
                  <option value="compact">Compact Quote</option>
                </select>
              </label>
              {field(
                "Quote text",
                component.quote,
                (quote) => update({ ...component, quote }),
                true,
              )}
              {component.preset === "executive" && (
                <p className="helper">
                  Use an approved transparent cutout portrait. Opaque photos
                  remain opaque; no automatic background removal is performed.
                </p>
              )}
            </>
          )}
          <MediaPicker
            compact
            label="Component portrait"
            value={block.image}
            onChange={(image) =>
              onChange({
                ...block,
                image:
                  image &&
                  component.kind === "testimonial" &&
                  component.preset === "executive" &&
                  image.assetId !== block.image?.assetId
                    ? { ...image, fit: "contain" }
                    : image,
              })
            }
          />
          {field("Person name", component.name, (name) =>
            update({ ...component, name }),
          )}
          {field("Designation", component.designation, (designation) =>
            update({ ...component, designation }),
          )}
          {field("Company / location", component.company, (company) =>
            update({ ...component, company }),
          )}
          {component.kind === "profile" && (
            <>
              {colour(
                "Nameplate colour",
                component.plateColour,
                (plateColour) => update({ ...component, plateColour }),
              )}
              <label>
                Portrait height (mm)
                <input
                  type="number"
                  min={20}
                  max={180}
                  value={block.figureHeightMm ?? 45}
                  onChange={(e) =>
                    onChange({
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
        </>
      )}
      {(component.kind === "cta" || component.kind === "info") && (
        <>
          {field("Box heading", component.heading, (heading) =>
            update({ ...component, heading }),
          )}
          <RichTextInput
            label="Box content"
            value={component.content}
            onChange={(content) => update({ ...component, content })}
          />
          {colour("Box background", component.background, (background) =>
            update({ ...component, background }),
          )}
          <label>
            Corner radius (mm)
            <input
              type="number"
              min={0}
              max={12}
              value={component.radius}
              onChange={(e) =>
                update({
                  ...component,
                  radius: Math.max(0, Math.min(12, Number(e.target.value))),
                })
              }
            />
          </label>
          {component.kind === "cta" ? (
            <>
              {field("Link label", component.linkLabel, (linkLabel) =>
                update({ ...component, linkLabel }),
              )}
              <label>
                CTA link
                <input
                  value={linkDraft}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLinkDraft(value);
                    const href = safeLink(value);
                    setError(
                      value && !href
                        ? "Enter a valid http, https or email link; the last valid link is retained."
                        : "",
                    );
                    if (!value || href) update({ ...component, href });
                  }}
                />
              </label>
              {colour("Box text colour", component.colour, (colour) =>
                update({ ...component, colour }),
              )}
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  update({
                    ...component,
                    background: "#FFDD00",
                    colour: "#034EA2",
                    radius: 3,
                  })
                }
              >
                ECU yellow preset
              </button>
            </>
          ) : (
            <>
              {colour(
                "Box border colour",
                component.borderColour,
                (borderColour) => update({ ...component, borderColour }),
              )}
              <label>
                Box border width (pt)
                <input
                  type="number"
                  min={0}
                  max={3}
                  step={0.25}
                  value={component.borderWidth}
                  onChange={(e) =>
                    update({
                      ...component,
                      borderWidth: Math.max(
                        0,
                        Math.min(3, Number(e.target.value)),
                      ),
                    })
                  }
                />
              </label>
              <label>
                Box padding (mm)
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={component.paddingMm}
                  onChange={(e) =>
                    update({
                      ...component,
                      paddingMm: Math.max(
                        1,
                        Math.min(15, Number(e.target.value)),
                      ),
                    })
                  }
                />
              </label>
            </>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
