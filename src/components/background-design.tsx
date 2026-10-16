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
    if (next.mode !== "default" && next.contrast === undefined)
      next.contrast = "auto";
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
    <label className="background-range">
      <span>{label}</span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={100}
        value={design[field]}
        onChange={(e) => update({ [field]: Number(e.target.value) })}
      />
      <output>{design[field]}%</output>
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
          <fieldset className="background-type-choices">
            <legend>Background type</legend>
            <div role="group" aria-label="Background type">
              {(
                [
                  ["default", "Original"],
                  ["solid", "Solid"],
                  ["gradient", "Gradient"],
                  ["image", "Image"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  type="button"
                  key={mode}
                  className="text-button"
                  aria-pressed={design.mode === mode}
                  onClick={() => update({ mode })}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="background-contrast">
            Text Contrast
            <select
              aria-label="Text Contrast"
              value={design.contrast ?? "original"}
              onChange={(e) =>
                update({ contrast: e.target.value as Design["contrast"] })
              }
            >
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="original">Original</option>
            </select>
          </label>
          {design.mode === "solid" && colour("Background colour", "colour")}
          {design.mode === "gradient" && (
            <>
              <div className="background-control-pair">
                {colour("Gradient start colour", "colour")}
                {colour("Gradient end colour", "gradientColour")}
              </div>
              <label className="background-range">
                <span>Direction</span>
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
                <output>{design.direction}°</output>
              </label>
              <p className="helper">
                0° up · 90° right · 180° down · 270° left
              </p>
            </>
          )}
          {design.mode !== "image" && (
            <details className="background-advanced">
              <summary>Advanced</summary>
              <label>
                Text protection
                <select
                  aria-label="Text protection"
                  value={design.textTreatment ?? "backing"}
                  onChange={(e) =>
                    update({
                      textTreatment: e.target.value as Design["textTreatment"],
                    })
                  }
                >
                  <option value="backing">Subtle backing when needed</option>
                  <option value="shadow">Subtle shadow when needed</option>
                  <option value="none">Colour only</option>
                </select>
              </label>
            </details>
          )}
          {design.mode === "image" && (
            <>
              <MediaPicker
                key={editingPage ? `page:${key}` : "story"}
                label="Background image"
                decorative
                compact
                showFraming={false}
                value={design.image}
                onChange={(image) => update({ image })}
              />
              <div className="background-control-pair">
                <label>
                  Image placement
                  <select
                    aria-label="Image placement"
                    value={design.placement}
                    onChange={(e) =>
                      update({
                        placement: e.target.value as Design["placement"],
                      })
                    }
                  >
                    <option value="top">Top</option>
                    <option value="centre">Centre</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </label>
                <label>
                  Fade direction
                  <select
                    aria-label="Fade direction"
                    value={design.fadeDirection}
                    onChange={(e) =>
                      update({
                        fadeDirection: e.target
                          .value as Design["fadeDirection"],
                      })
                    }
                  >
                    <option value="down">Top to bottom</option>
                    <option value="up">Bottom to top</option>
                  </select>
                </label>
              </div>
              {range("Image coverage", "coverage", 1)}
              {range("Image opacity", "opacity")}
              {range("Fade start", "fadeStart")}
              <div className="background-control-pair">
                {colour("Background colour", "colour")}
                {colour("Fade-to colour", "fadeColour")}
              </div>
              <details className="background-advanced">
                <summary>Advanced</summary>
                <label>
                  Text protection
                  <select
                    aria-label="Text protection"
                    value={design.textTreatment ?? "backing"}
                    onChange={(e) =>
                      update({
                        textTreatment: e.target
                          .value as Design["textTreatment"],
                      })
                    }
                  >
                    <option value="backing">Subtle backing when needed</option>
                    <option value="shadow">Subtle shadow when needed</option>
                    <option value="none">Colour only</option>
                  </select>
                </label>
                {design.image && (
                  <>
                    <label>
                      Image fit
                      <select
                        aria-label="Background image fit"
                        value={design.image.fit ?? "cover"}
                        onChange={(e) =>
                          update({
                            image: {
                              ...design.image!,
                              fit: e.target.value as "cover" | "contain",
                            },
                          })
                        }
                      >
                        <option value="cover">Fill frame / crop</option>
                        <option value="contain">Show complete image</option>
                      </select>
                    </label>
                    {(["x", "y"] as const).map((axis) => (
                      <label className="background-range" key={axis}>
                        <span>
                          {axis === "x" ? "Horizontal crop" : "Vertical crop"}
                        </span>
                        <input
                          type="range"
                          aria-label={`Background image ${axis === "x" ? "horizontal" : "vertical"} position`}
                          min={0}
                          max={100}
                          value={design.image!.focalPoint[axis] * 100}
                          onChange={(e) =>
                            update({
                              image: {
                                ...design.image!,
                                focalPoint: {
                                  ...design.image!.focalPoint,
                                  [axis]: Number(e.target.value) / 100,
                                },
                              },
                            })
                          }
                        />
                        <output>
                          {Math.round(design.image!.focalPoint[axis] * 100)}%
                        </output>
                      </label>
                    ))}
                  </>
                )}
                {range("Fade strength", "fadeStrength")}
                <p className="helper">
                  For a seamless edge, match the fade-to and background colours
                  at 100% strength. Top images usually fade down; bottom images
                  usually fade up.
                </p>
              </details>
            </>
          )}
        </div>
      )}
    </div>
  );
}
