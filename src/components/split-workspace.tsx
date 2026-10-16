"use client";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
export function SplitWorkspace({
  children,
  stories,
  preview,
}: {
  children: ReactNode;
  stories: ReactNode;
  preview: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [shares, setShares] = useState([23, 42, 35]);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  function boundary(which: number, value: number) {
    setShares((previous) => {
      const next = [...previous];
      if (which === 0) {
        next[0] = Math.min(
          35,
          Math.max(16, Math.min(value, previous[0] + previous[1] - 28)),
        );
        next[1] = previous[0] + previous[1] - next[0];
      } else {
        const edge = Math.min(76, Math.max(previous[0] + 28, value));
        next[1] = edge - previous[0];
        next[2] = 100 - edge;
      }
      return next;
    });
  }
  function divider(which: number) {
    const value = which === 0 ? shares[0] : shares[0] + shares[1];
    return (
      <div
        role="separator"
        aria-label={
          which === 0
            ? "Resize stories and editor"
            : "Resize editor and preview"
        }
        aria-orientation="vertical"
        aria-valuemin={which === 0 ? 16 : shares[0] + 28}
        aria-valuemax={which === 0 ? 35 : 76}
        aria-valuenow={Math.round(value)}
        aria-valuetext={Math.round(value) + "% from left"}
        tabIndex={0}
        className="workspace-divider"
        onDoubleClick={() => setShares([23, 42, 35])}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            const box = root.current?.getBoundingClientRect();
            if (box)
              boundary(which, ((event.clientX - box.left) / box.width) * 100);
          }
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            boundary(
              which,
              event.key === "Home"
                ? which === 0
                  ? 16
                  : shares[0] + 28
                : event.key === "End"
                  ? which === 0
                    ? 35
                    : 76
                  : value + (event.key === "ArrowLeft" ? -2 : 2),
            );
          }
        }}
      />
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
        className="split-workspace three-column-workspace"
        data-mobile-view={tab}
        style={
          {
            "--stories-share": shares[0] + "fr",
            "--editor-share": shares[1] + "fr",
            "--preview-share": shares[2] + "fr",
          } as CSSProperties
        }
      >
        <section aria-label="Stories" className="workspace-stories">
          {stories}
        </section>
        {divider(0)}
        <section
          id="edit-panel"
          aria-label="Content editor"
          className="workspace-editor"
        >
          {children}
        </section>
        {divider(1)}
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
