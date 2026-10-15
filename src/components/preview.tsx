"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import type { Issue } from "../domain/issue";
import type { LayoutResult } from "../magazine/pagination";
import { mediaRepository } from "../media/local";
import { prepareRenderIssue } from "../media/render";
import { magazineDocument } from "../magazine/document";
import { withPreviewControls } from "./preview-document";

export function Preview({
  issue,
  activeStoryId,
}: {
  issue: Issue;
  activeStoryId?: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const pageRef = useRef(1);
  const navigatedStory = useRef<string | undefined>(undefined);
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
                  ? "Preview needs a nonempty issue title, valid volume and nonempty section/story titles. Check content limits before retrying."
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
      { type: "preview-control", renderId: doc.id, page, zoom },
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
        event.data.type === "magazine-ready" &&
        Number.isInteger(event.data.pages) &&
        Array.isArray(event.data.warnings)
      ) {
        const result = event.data as LayoutResult & { renderId: string };
        setLayout(result);
        const story = selectedStory.current;
        const destination =
          story && story !== navigatedStory.current
            ? result.storyPages[story]?.physicalPage
            : undefined;
        if (destination) navigatedStory.current = story;
        const page = Math.min(result.pages, destination ?? pageRef.current);
        frame.current?.contentWindow?.postMessage(
          {
            type: "preview-control",
            renderId: doc.id,
            page,
            zoom: zoomRef.current,
          },
          "*",
        );
      } else if (
        event.data.type === "preview-position" &&
        Number.isInteger(event.data.page) &&
        event.data.page >= 1 &&
        Number.isFinite(event.data.zoom)
      ) {
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
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }
  function zoom(value: "fit" | number) {
    zoomRef.current = value;
    setZoomMode(value);
    send(undefined, value);
  }
  return (
    <section className="preview-panel">
      <div className="preview-toolbar">
        <div>
          <h2>Magazine preview</h2>
          <p>
            A4 ·{" "}
            {currentLayout
              ? currentLayout.pages + " pages"
              : "Preparing pages…"}
          </p>
        </div>
        <button
          className="button primary"
          disabled={busy || !ready}
          onClick={download}
        >
          <Download size={16} />
          {busy ? "Rendering PDF…" : "Export PDF"}
        </button>
      </div>
      <div className="preview-navigation" aria-label="Preview controls">
        <button
          className="icon-button"
          aria-label="Previous page"
          disabled={!currentLayout || position.page <= 1}
          onClick={() => send(position.page - 1)}
        >
          ←
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
          / {currentLayout?.pages ?? "…"}
        </span>
        <button
          className="icon-button"
          aria-label="Next page"
          disabled={!currentLayout || position.page >= currentLayout.pages}
          onClick={() => send(position.page + 1)}
        >
          →
        </button>
        <button
          className="icon-button"
          aria-label="Zoom out"
          disabled={!currentLayout || position.zoom <= 10}
          onClick={() => zoom(Math.max(10, position.zoom - 10))}
        >
          −
        </button>
        <output aria-label="Preview zoom">{position.zoom}%</output>
        <button
          className="icon-button"
          aria-label="Zoom in"
          disabled={!currentLayout || position.zoom >= 200}
          onClick={() => zoom(Math.min(200, position.zoom + 10))}
        >
          +
        </button>
        <button
          className="button secondary fit-width"
          aria-pressed={zoomMode === "fit"}
          disabled={!currentLayout}
          onClick={() => zoom("fit")}
        >
          Fit to width
        </button>
      </div>
      <div className="layout-status" role="status">
        {prepared?.error
          ? "Preview needs attention."
          : updating
            ? "Updating preview…"
            : currentLayout?.warnings.length
              ? currentLayout.warnings.join(" ")
              : "Layout checked. Page numbers and contents are generated from these pages."}
      </div>
      {prepared?.error && (
        <p className="error" role="alert">
          {prepared.error} Your unsaved content is retained; correct it in the
          editor.
        </p>
      )}
      {tooLarge && (
        <p className="error" role="alert">
          Images and content exceed the existing 1 MB PDF request limit. Replace
          large images with smaller files before export. No images have been
          resized or omitted.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <details className="preview-notices">
        <summary>
          Preview notes
          {currentLayout?.notices.length
            ? " (" + currentLayout.notices.length + ")"
            : ""}
        </summary>
        {currentLayout?.notices.map((notice) => (
          <p key={notice} className="muted" role="note">
            {notice}
          </p>
        ))}
        {issue.sample && (
          <p className="sample-notice">
            Demonstration content only. This edition contains fictional
            editorial copy and is not approved for publication.
          </p>
        )}
        <p className="muted">
          Text flows at its authored size. Preview and PDF use the same magazine
          renderer. View controls do not change the exported pages.
        </p>
      </details>
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
        className="magazine-frame"
      />
    </section>
  );
}
