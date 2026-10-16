"use client";
import { useEffect, useRef, useState } from "react";
import { Palette, X } from "lucide-react";
import type { Story } from "../domain/issue";
import {
  defaultBackground,
  type BackgroundDesign as Design,
} from "../domain/background";
import { MediaPicker } from "./media-picker";
export function BackgroundDesign({
  story,
  pageIndex,
  onChange,
}: {
  story: Story;
  pageIndex: number | null;
  onChange: (story: Story) => void;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"story" | "page">("story");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const key = pageIndex === null ? null : String(pageIndex);
  const override = key === null ? undefined : story.pageBackgrounds?.[key];
  const editingPage = scope === "page" && !!override;
  const design =
    (editingPage ? override : story.background) ?? defaultBackground();
  const selectedDesign = override ?? story.background;
  const summary =
    !selectedDesign || selectedDesign.mode === "default"
      ? "Default original magazine background"
      : selectedDesign.mode === "solid"
        ? `Solid colour · ${selectedDesign.colour}`
        : selectedDesign.mode === "gradient"
          ? `Gradient · ${selectedDesign.direction}°`
          : `Image · ${selectedDesign.placement} · ${selectedDesign.coverage}%`;
  const title = editingPage
    ? `Page Override · Story page ${pageIndex! + 1}`
    : "Story Background";
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function update(patch: Partial<Design>) {
    const next = { ...design, ...patch };
    if (editingPage && key !== null)
      onChange({
        ...story,
        pageBackgrounds: { ...story.pageBackgrounds, [key]: next },
      });
    else onChange({ ...story, background: next });
  }
  function reset() {
    if (key === null) return;
    const backgrounds = { ...story.pageBackgrounds };
    delete backgrounds[key];
    onChange({ ...story, pageBackgrounds: backgrounds });
    setScope("story");
  }
  const colour = (
    label: string,
    field: "colour" | "gradientColour" | "fadeColour",
  ) => (
    <label>
      {label}
      <input
        type="color"
        aria-label={label}
        value={design[field]}
        onChange={(e) =>
          update(
            field === "colour" && design.fadeColour === design.colour
              ? { colour: e.target.value, fadeColour: e.target.value }
              : { [field]: e.target.value },
          )
        }
      />
    </label>
  );
  const range = (
    label: string,
    field: "coverage" | "opacity" | "fadeStart" | "fadeStrength",
    min = 0,
  ) => (
    <label>
      {label} · {design[field]}%
      <input
        aria-label={label}
        type="range"
        min={min}
        max={100}
        value={design[field]}
        onChange={(e) => update({ [field]: Number(e.target.value) })}
      />
    </label>
  );
  return (
    <div className="background-design" ref={container}>
      <div className="background-design-summary">
        <Palette size={17} aria-hidden="true" />
        <div>
          <strong>Background Design</strong>
          <small>
            {summary} · {override ? "Page Override" : "Story Background"}
          </small>
        </div>
        <button
          ref={trigger}
          type="button"
          className="button secondary"
          aria-expanded={open}
          onClick={() => {
            setScope(override ? "page" : "story");
            setOpen(!open);
          }}
        >
          Customize
        </button>
      </div>
      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-label="Background Design settings"
          tabIndex={-1}
          className="background-design-panel"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              close();
            }
          }}
        >
          <div className="background-panel-heading">
            <strong>{title}</strong>
            <button
              type="button"
              className="icon-button"
              aria-label="Close Background Design"
              onClick={close}
            >
              <X size={17} />
            </button>
          </div>
          <p className="helper">
            Story pages inherit this design unless individually overridden.
          </p>
          <label className="background-override-toggle">
            <input
              type="checkbox"
              checked={!!override}
              disabled={key === null}
              onChange={(e) => {
                if (!e.target.checked) return reset();
                if (key !== null) {
                  onChange({
                    ...story,
                    pageBackgrounds: {
                      ...story.pageBackgrounds,
                      [key]: { ...(story.background ?? defaultBackground()) },
                    },
                  });
                  setScope("page");
                }
              }}
            />
            Override this page
            {pageIndex === null
              ? " · Select a page of this story in preview"
              : ` · Story page ${pageIndex + 1}`}
          </label>
          {override && (
            <div className="background-scope">
              <button
                type="button"
                className="text-button"
                aria-pressed={!editingPage}
                onClick={() => setScope("story")}
              >
                Story Background
              </button>
              <button
                type="button"
                className="text-button"
                aria-pressed={editingPage}
                onClick={() => setScope("page")}
              >
                Page Override
              </button>
              <button type="button" className="text-button" onClick={reset}>
                Reset to Story Background
              </button>
            </div>
          )}
          <label>
            Background type
            <select
              aria-label="Background type"
              value={design.mode}
              onChange={(e) =>
                update({ mode: e.target.value as Design["mode"] })
              }
            >
              <option value="default">
                Default original magazine background
              </option>
              <option value="solid">Solid colour</option>
              <option value="gradient">Gradient</option>
              <option value="image">Background image</option>
            </select>
          </label>
          {design.mode !== "default" &&
            colour(
              design.mode === "gradient"
                ? "Gradient start colour"
                : "Background colour",
              "colour",
            )}
          {design.mode === "gradient" && (
            <>
              {colour("Gradient end colour", "gradientColour")}
              <label>
                Gradient direction · {design.direction}°
                <input
                  type="range"
                  aria-label="Gradient direction"
                  min={0}
                  max={360}
                  value={design.direction}
                  onChange={(e) =>
                    update({ direction: Number(e.target.value) })
                  }
                />
              </label>
              <p className="helper">
                0° bottom to top · 90° left to right · 180° top to bottom · 270°
                right to left
              </p>
            </>
          )}
          {design.mode === "image" && (
            <>
              <MediaPicker
                label="Background image"
                decorative
                value={design.image}
                onChange={(image) => update({ image })}
              />
              <label>
                Image placement
                <select
                  aria-label="Image placement"
                  value={design.placement}
                  onChange={(e) =>
                    update({ placement: e.target.value as Design["placement"] })
                  }
                >
                  <option value="top">Top</option>
                  <option value="centre">Centre</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>
              {range("Image coverage", "coverage", 1)}
              {range("Image opacity", "opacity")}
              <label>
                Fade direction
                <select
                  aria-label="Fade direction"
                  value={design.fadeDirection}
                  onChange={(e) =>
                    update({
                      fadeDirection: e.target.value as Design["fadeDirection"],
                    })
                  }
                >
                  <option value="down">Top to bottom</option>
                  <option value="up">Bottom to top</option>
                </select>
              </label>
              {range("Fade start", "fadeStart")}
              {range("Fade strength", "fadeStrength")}
              {colour("Fade-to colour", "fadeColour")}
              <p className="helper">
                For a seamless edge, match the fade-to and background colours
                and use 100% fade strength. Top images usually fade down; bottom
                images usually fade up.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
