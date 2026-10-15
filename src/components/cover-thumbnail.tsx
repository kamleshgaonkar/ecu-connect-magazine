"use client";
import { useEffect, useState } from "react";
import type { Issue } from "../domain/issue";
import { mediaRepository } from "../media/local";
import { prepareRenderIssue } from "../media/render";
import { magazineDocument } from "../magazine/document";
import { withCoverThumbnail } from "./preview-document";

/** Renders the issue's real cover with the approved renderer, scaled down. */
export function CoverThumbnail({ issue }: { issue: Issue }) {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const coverOnly: Issue = {
      ...issue,
      sections: issue.sections.map((section) => ({
        ...section,
        enabled: false,
      })),
    };
    prepareRenderIssue(coverOnly, mediaRepository)
      .then((prepared) => {
        if (active) setHtml(withCoverThumbnail(magazineDocument(prepared)));
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [issue]);
  return (
    <div className="cover-thumbnail" aria-hidden="true">
      {html && !failed ? (
        <iframe
          title={"Cover of " + issue.title}
          sandbox="allow-scripts"
          srcDoc={html}
          tabIndex={-1}
          loading="lazy"
        />
      ) : (
        <div className="cover-placeholder">
          <span>ECU CONNECT</span>
          <strong>{issue.cover?.headline || issue.title}</strong>
          <small>Vol. {issue.volume}</small>
        </div>
      )}
    </div>
  );
}
