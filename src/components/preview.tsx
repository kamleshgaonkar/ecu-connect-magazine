"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  ScanLine,
  MoreHorizontal,
  Maximize2,
  X,
  Minus,
  Plus,
} from "lucide-react";
import type { Issue } from "../domain/issue";
import type { LayoutResult } from "../magazine/pagination";
import { mediaRepository } from "../media/local";
import { prepareRenderIssue } from "../media/render";
import { magazineDocument } from "../magazine/document";
import { withPreviewControls } from "./preview-document";
import { friendlyPreviewMessage } from "../studio/layout-catalog";

export type PreviewPageSelection = { storyId: string; index: number } | null;
export function Preview({
  issue,
  activeStoryId,
  onPageSelect,
}: {
  issue: Issue;
  activeStoryId?: string;
  onPageSelect?: (page: PreviewPageSelection) => void;
}) {
  const pageSelectionCallback = useRef(onPageSelect);
  useEffect(() => {
    pageSelectionCallback.current = onPageSelect;
  }, [onPageSelect]);
  const frame = useRef<HTMLIFrameElement>(null);
  const panel = useRef<HTMLElement>(null);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [touchControls, setTouchControls] = useState(false);
  const fullscreenRef = useRef(false);
  const pageRef = useRef(1);
  const navigatedStory = useRef<string | undefined>(undefined);
  const storyPages = useRef<LayoutResult["storyPages"]>({});
  const selectedStory = useRef(activeStoryId);
  const [prepared, setPrepared] = useState<{
    issue: Issue | null;
    source: Issue;
    error: string | null;
  } | null>(null);
  const [layout, setLayout] = useState<
    (LayoutResult & { renderId: string }) | null
  >(null);
  const [position, setPosition] = useState({ page: 1, zoom: 100 });
  const [zoomMode, setZoomMode] = useState<"fit" | number>("fit");
  const zoomRef = useRef<"fit" | number>("fit");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      prepareRenderIssue(issue, mediaRepository)
        .then((value) => {
          if (active) setPrepared({ issue: value, source: issue, error: null });
        })
        .catch((e) => {
          if (active)
            setPrepared({
              issue: null,
              source: issue,
              error:
                e instanceof Error && e.name === "ZodError"
                  ? "Add a magazine title, a valid volume, and a title for each section and story."
                  : e instanceof Error
                    ? e.message
                    : "Unable to read local images.",
            });
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [issue]);

  const doc = useMemo(() => {
    const id = crypto.randomUUID();
    if (!prepared?.issue) return { id, html: null };
    return {
      id,
      html: withPreviewControls(magazineDocument(prepared.issue, id), id),
    };
  }, [prepared]);
  const payload = useMemo(
    () => (prepared?.issue ? JSON.stringify(prepared.issue) : ""),
    [prepared],
  );
  const tooLarge = useMemo(
    () => new TextEncoder().encode(payload).length > 1_000_000,
    [payload],
  );
  const currentLayout = layout?.renderId === doc.id ? layout : null;
  const updating = prepared?.source !== issue || !currentLayout;
  const ready =
    !updating &&
    !!prepared?.issue &&
    !tooLarge &&
    !currentLayout?.warnings.length &&
    !prepared?.error;

  function send(page?: number, zoom: "fit" | number = zoomRef.current) {
    frame.current?.contentWindow?.postMessage(
      {
        type: "preview-control",
        renderId: doc.id,
        page,
        zoom,
        fullscreen: fullscreenRef.current,
      },
      "*",
    );
  }
  useEffect(() => {
    selectedStory.current = activeStoryId;
    if (
      layout?.renderId !== doc.id ||
      !activeStoryId ||
      activeStoryId === navigatedStory.current
    )
      return;
    const destination = layout.storyPages[activeStoryId]?.physicalPage;
    if (destination) {
      navigatedStory.current = activeStoryId;
      frame.current?.contentWindow?.postMessage(
        {
          type: "preview-control",
          renderId: doc.id,
          page: destination,
          zoom: zoomRef.current,
          fullscreen: fullscreenRef.current,
        },
        "*",
      );
    }
  }, [activeStoryId, layout, doc.id]);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (
        event.source !== frame.current?.contentWindow ||
        event.data?.renderId !== doc.id
      )
        return;
      if (
        event.data.type === "preview-grid-measured" &&
        event.data.cells &&
        typeof event.data.cells === "object"
      ) {
        window.dispatchEvent(
          new CustomEvent("ecu-grid-measured", { detail: event.data.cells }),
        );
      }
      if (event.data.type === "preview-focus" && fullscreenRef.current) {
        const controls = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),select:not(:disabled),summary",
          ) ?? [],
        ).filter((el) => el.getClientRects().length > 0);
        (event.data.backward ? controls.at(-1) : controls[0])?.focus();
      }
      if (event.data.type === "preview-close") {
        fullscreenRef.current = false;
        setFullscreen(false);
      }
      if (
        event.data.type === "magazine-ready" &&
        Number.isInteger(event.data.pages) &&
        Array.isArray(event.data.warnings)
      ) {
        const result = event.data as LayoutResult & { renderId: string };
        setLayout(result);
        const story = selectedStory.current;
        const destination =
          story &&
          (story !== navigatedStory.current ||
            storyPages.current[story]?.physicalPage !==
              result.storyPages[story]?.physicalPage)
            ? result.storyPages[story]?.physicalPage
            : undefined;
        storyPages.current = result.storyPages;
        if (destination) navigatedStory.current = story;
        const page = Math.min(result.pages, destination ?? pageRef.current);
        frame.current?.contentWindow?.postMessage(
          {
            type: "preview-control",
            renderId: doc.id,
            page,
            zoom: zoomRef.current,
            fullscreen: fullscreenRef.current,
          },
          "*",
        );
      } else if (
        event.data.type === "preview-position" &&
        Number.isInteger(event.data.page) &&
        event.data.page >= 1 &&
        Number.isFinite(event.data.zoom)
      ) {
        pageSelectionCallback.current?.(
          typeof event.data.storyId === "string" &&
            Number.isInteger(event.data.storyPage) &&
            event.data.storyPage >= 0
            ? { storyId: event.data.storyId, index: event.data.storyPage }
            : null,
        );
        pageRef.current = event.data.page;
        setPosition({ page: event.data.page, zoom: event.data.zoom });
      }
    }
    window.addEventListener("message", receive);
    frame.current?.contentWindow?.postMessage(
      { type: "magazine-request" },
      "*",
    );
    return () => window.removeEventListener("message", receive);
  }, [doc.id]);

  useEffect(() => {
    if (!fullscreen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const hidden = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".workspace-stories,.workspace-editor,.editor-heading,.mobile-editor-tabs,.workspace-divider",
      ),
    );
    hidden.forEach((el) => (el.inert = true));
    panel.current
      ?.querySelector<HTMLButtonElement>(
        "[aria-label='Close full-screen preview']",
      )
      ?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        fullscreenRef.current = false;
        setFullscreen(false);
      }
      if (
        ["ArrowLeft", "ArrowRight"].includes(event.key) &&
        !(event.target instanceof HTMLSelectElement) &&
        !(event.target instanceof HTMLInputElement)
      ) {
        event.preventDefault();
        frame.current?.contentWindow?.postMessage(
          {
            type: "preview-control",
            renderId: doc.id,
            page: Math.max(
              1,
              Math.min(
                layout?.pages ?? 1,
                pageRef.current + (event.key === "ArrowLeft" ? -1 : 1),
              ),
            ),
            zoom: zoomRef.current,
            fullscreen: true,
          },
          "*",
        );
      }
      if (event.key === "Tab") {
        const controls = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), select:not(:disabled), summary, iframe",
          ) ?? [],
        );
        const visible = controls.filter((el) => el.getClientRects().length > 0);
        const first = visible[0],
          last = visible[visible.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => {
      hidden.forEach((el) => (el.inert = false));
      window.removeEventListener("keydown", keyboard);
      previousFocus?.focus();
    };
  }, [fullscreen, doc.id, layout?.pages]);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage(
      {
        type: "preview-control",
        renderId: doc.id,
        page: pageRef.current,
        zoom: zoomRef.current,
        fullscreen,
      },
      "*",
    );
  }, [fullscreen, doc.id]);
  function toggleFullscreen() {
    const next = !fullscreenRef.current;
    fullscreenRef.current = next;
    setFullscreen(next);
    zoomRef.current = "fit";
    setZoomMode("fit");
    send(pageRef.current, "fit");
    if (!next) fullscreenButton.current?.focus();
  }
  async function download() {
    if (!ready) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      if (!response.ok) throw new Error((await response.json()).error);
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ecu-connect-volume-" + issue.volume + ".pdf";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(
        e instanceof Error
          ? friendlyPreviewMessage(e.message)
          : "Export failed",
      );
    } finally {
      setBusy(false);
    }
  }
  function zoom(value: "fit" | number) {
    zoomRef.current = value;
    setZoomMode(value);
    send(undefined, value);
  }
  const blocking = !!(
    prepared?.error ||
    tooLarge ||
    (!updating && currentLayout?.warnings.length)
  );
  const reviewCount =
    (currentLayout?.notices.length ?? 0) + (issue.sample ? 1 : 0);
  const exportTarget =
    typeof document !== "undefined"
      ? document.getElementById("workspace-export")
      : null;
  const exportButton = (
    <button
      className="button primary"
      disabled={busy || !ready}
      onClick={download}
    >
      <Download size={17} />
      {busy ? "Rendering PDF…" : "Export PDF"}
    </button>
  );
  return (
    <section
      data-preview-ready={!updating && !!currentLayout}
      data-controls-visible={touchControls}
      onPointerLeave={() => setTouchControls(false)}
      ref={panel}
      className={"preview-panel" + (fullscreen ? " fullscreen-preview" : "")}
      role={fullscreen ? "dialog" : undefined}
      aria-modal={fullscreen ? true : undefined}
      aria-label={fullscreen ? "Full-screen magazine preview" : undefined}
    >
      {exportTarget && createPortal(exportButton, exportTarget)}
      <button
        className="preview-touch-toggle icon-button"
        aria-label="Show preview controls"
        onClick={() => setTouchControls(!touchControls)}
      >
        <MoreHorizontal size={18} />
      </button>
      <div
        className="preview-navigation preview-floating"
        aria-label="Preview controls"
      >
        <div className="preview-group" role="group" aria-label="Pages">
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={!currentLayout || position.page <= 1}
            onClick={() => send(position.page - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <label className="preview-page-label">
            Page
            <select
              aria-label="Preview page"
              value={Math.min(position.page, currentLayout?.pages ?? 1)}
              disabled={!currentLayout}
              onChange={(e) => send(Number(e.target.value))}
            >
              {Array.from({ length: currentLayout?.pages ?? 1 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <span className="preview-page-total">
            of {currentLayout?.pages ?? "…"}
          </span>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={!currentLayout || position.page >= currentLayout.pages}
            onClick={() => send(position.page + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="preview-group" role="group" aria-label="Zoom">
          <button
            className="icon-button"
            aria-label="Zoom out"
            disabled={!currentLayout || position.zoom <= 10}
            onClick={() => zoom(Math.max(10, position.zoom - 10))}
          >
            <Minus size={18} />
          </button>
          <output aria-label="Preview zoom">{position.zoom}%</output>
          <button
            className="icon-button"
            aria-label="Zoom in"
            disabled={!currentLayout || position.zoom >= 200}
            onClick={() => zoom(Math.min(200, position.zoom + 10))}
          >
            <Plus size={18} />
          </button>
          <button
            className="button secondary fit-width"
            aria-label="Fit page"
            title="Fit page"
            aria-pressed={zoomMode === "fit"}
            disabled={!currentLayout}
            onClick={() => zoom("fit")}
          >
            <ScanLine size={17} />
          </button>
        </div>
        <button
          ref={fullscreenButton}
          className="icon-button"
          aria-label={
            fullscreen
              ? "Close full-screen preview"
              : "Open full-screen preview"
          }
          onClick={toggleFullscreen}
          disabled={!currentLayout}
        >
          {fullscreen ? <X size={19} /> : <Maximize2 size={19} />}
        </button>
        <details className="preview-notices preview-secondary">
          <summary aria-label="More preview options">
            <MoreHorizontal size={18} />
            {reviewCount > 0 && (
              <span
                className="preview-warning-dot"
                aria-label="Review notes available"
              />
            )}
          </summary>
          <div className="preview-review-panel">
            <h3>Review issues{reviewCount ? " (" + reviewCount + ")" : ""}</h3>
            {currentLayout?.notices.map((notice) => (
              <p key={notice} className="muted" role="note">
                {friendlyPreviewMessage(notice)}
              </p>
            ))}
            {issue.sample && (
              <p className="sample-notice">
                Demonstration content only. This edition contains fictional
                editorial copy and is not approved for publication.
              </p>
            )}
            <p className="muted">
              Your layout and text sizes stay the same when you export. Zoom
              only changes your view.
            </p>
          </div>
        </details>
      </div>
      {blocking && (
        <div className="layout-status blocking" role="alert">
          <AlertTriangle size={16} />
          <span>
            {prepared?.error
              ? "Preview needs attention. Your content is retained."
              : currentLayout?.warnings.map(friendlyPreviewMessage).join(" ")}
          </span>
        </div>
      )}
      {prepared?.error && (
        <p className="error" role="alert">
          {prepared.error} Your unsaved content is retained; correct it in the
          editor.
        </p>
      )}
      {tooLarge && (
        <p className="error" role="alert">
          Your magazine is larger than the 1 MB PDF request limit. Choose
          smaller image files before exporting. Your images have not been
          changed.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <iframe
        ref={frame}
        onLoad={() =>
          frame.current?.contentWindow?.postMessage(
            { type: "magazine-request" },
            "*",
          )
        }
        title="A4 magazine pages"
        sandbox="allow-scripts"
        srcDoc={doc.html ?? undefined}
        aria-busy={updating}
        className="magazine-frame"
      />
    </section>
  );
}
