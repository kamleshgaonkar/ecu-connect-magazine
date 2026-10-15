"use client";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
export function SplitWorkspace({
  children,
  preview,
}: {
  children: ReactNode;
  preview: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(60);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  function resize(clientX: number) {
    const box = root.current?.getBoundingClientRect();
    if (box)
      setRatio(
        Math.min(75, Math.max(40, ((clientX - box.left) / box.width) * 100)),
      );
  }
  return (
    <>
      <div
        className="editor-tabs mobile-editor-tabs"
        role="tablist"
        aria-label="Magazine view"
      >
        {(["edit", "preview"] as const).map((view) => (
          <button
            key={view}
            role="tab"
            id={view + "-tab"}
            aria-controls={view + "-panel"}
            aria-selected={tab === view}
            tabIndex={tab === view ? 0 : -1}
            onClick={() => setTab(view)}
            onKeyDown={(event) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "edit"
                    : event.key === "End"
                      ? "preview"
                      : view === "edit"
                        ? "preview"
                        : "edit";
                setTab(next);
                document.getElementById(next + "-tab")?.focus();
              }
            }}
          >
            {view === "edit" ? "Edit content" : "Preview & export"}
          </button>
        ))}
      </div>
      <div
        ref={root}
        className="split-workspace"
        data-mobile-view={tab}
        style={{ "--editor-share": ratio + "%" } as CSSProperties}
      >
        <section
          id="edit-panel"
          aria-label="Content editor"
          className="workspace-editor"
        >
          {children}
        </section>
        <div
          role="separator"
          aria-label="Resize editor and preview"
          aria-orientation="vertical"
          aria-valuemin={40}
          aria-valuemax={75}
          aria-valuenow={Math.round(ratio)}
          aria-valuetext={Math.round(ratio) + "% editor"}
          tabIndex={0}
          className="workspace-divider"
          onDoubleClick={() => setRatio(60)}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              resize(event.clientX);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onKeyDown={(event) => {
            if (
              ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
            ) {
              event.preventDefault();
              setRatio((value) =>
                event.key === "Home"
                  ? 40
                  : event.key === "End"
                    ? 75
                    : Math.min(
                        75,
                        Math.max(
                          40,
                          value + (event.key === "ArrowLeft" ? -2 : 2),
                        ),
                      ),
              );
            }
          }}
        />
        <section
          id="preview-panel"
          aria-label="Live magazine preview"
          className="workspace-preview"
        >
          {preview}
        </section>
      </div>
    </>
  );
}
