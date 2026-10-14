"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Issue } from "../domain/issue";
import { mediaRepository } from "../media/local";
import { prepareRenderIssue } from "../media/render";
import { magazineDocument } from "../magazine/document";
export function Preview({ issue }: { issue: Issue }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [prepared, setPrepared] = useState<{
    issue: Issue | null;
    error: string | null;
  }>({ issue: null, error: null });
  useEffect(() => {
    let active = true;
    prepareRenderIssue(issue, mediaRepository)
      .then((value) => {
        if (active) setPrepared({ issue: value, error: null });
      })
      .catch((e) => {
        if (active)
          setPrepared({
            issue: null,
            error:
              e instanceof Error && e.name === "ZodError"
                ? "Preview needs a nonempty issue title, valid volume and nonempty section/story titles. Check content limits before retrying."
                : e instanceof Error
                  ? e.message
                  : "Unable to read local images.",
          });
      });
    return () => {
      active = false;
    };
  }, [issue]);
  const doc = useMemo(() => {
    const id = crypto.randomUUID();
    if (!prepared.issue) return { id, html: null, error: prepared.error };
    try {
      return { id, html: magazineDocument(prepared.issue, id), error: null };
    } catch {
      return {
        id,
        html: null,
        error:
          "Preview needs a nonempty issue title, valid volume and nonempty section/story titles. Check content limits before retrying.",
      };
    }
  }, [prepared]);
  const payload = prepared.issue ? JSON.stringify(prepared.issue) : "";
  const tooLarge = new TextEncoder().encode(payload).length > 1_000_000;
  const [layout, setLayout] = useState<{
      pages: number;
      warnings: string[];
      notices: string[];
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    function receive(e: MessageEvent) {
      if (
        e.source === frame.current?.contentWindow &&
        e.data?.type === "magazine-ready" &&
        e.data.renderId === doc.id &&
        Array.isArray(e.data.warnings)
      )
        setLayout({
          pages: e.data.pages,
          warnings: e.data.warnings,
          notices: e.data.notices ?? [],
        });
    }
    window.addEventListener("message", receive);
    frame.current?.contentWindow?.postMessage(
      { type: "magazine-request" },
      "*",
    );
    return () => window.removeEventListener("message", receive);
  }, [doc.id]);
  async function download() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `ecu-connect-volume-${issue.volume}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }
  if (doc.error)
    return (
      <section className="preview-panel">
        <p className="error" role="alert">
          {doc.error}
        </p>
        <p className="muted">
          Return to Edit content to correct the details. Your unsaved content is
          retained.
        </p>
      </section>
    );
  return (
    <section className="preview-panel">
      <div className="preview-toolbar">
        <div>
          <h2>Magazine preview</h2>
          <p>
            A4 · measured pagination ·{" "}
            {layout ? `${layout.pages} pages` : "Preparing pages…"}
          </p>
        </div>
        <button
          className="button primary"
          disabled={
            busy ||
            !prepared.issue ||
            tooLarge ||
            !layout ||
            !!layout.warnings.length
          }
          onClick={download}
        >
          <Download size={16} />
          {busy ? "Rendering PDF…" : "Export PDF"}
        </button>
      </div>
      <div className="layout-status" role="status">
        {layout?.warnings.length ? (
          <>
            <AlertTriangle size={16} />
            {layout.warnings.join(" ")}
          </>
        ) : (
          <>
            <CheckCircle2 size={16} />
            {layout
              ? "Layout checked. Page numbers and contents are generated from these pages."
              : "Measuring story blocks…"}
          </>
        )}
      </div>
      {layout?.notices.map((notice) => (
        <p key={notice} className="muted mt-2" role="note">
          {notice}
        </p>
      ))}
      {issue.sample && (
        <p className="sample-notice">
          Demonstration content only. This edition contains fictional editorial
          copy and is not approved for publication.
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
        <p role="alert" className="error">
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
        className="magazine-frame"
      />
      <p className="muted preview-note">
        Text flows onto additional pages at its original size. Export is blocked
        if unresolved overflow is detected. Preview uses your browser’s fonts;
        PDF uses server Chromium.
      </p>
    </section>
  );
}
