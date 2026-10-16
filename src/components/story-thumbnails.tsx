"use client";
import { useEffect, useMemo, useRef, useState } from "react";
export type StorySnapshot = { html: string; first: number; last: number };
/** Column 1 consumes measured opening pages; it never repaginates the magazine. */
export function useStoryThumbnails(ids: string[]) {
  const key = ids.join("|");
  const [result, setResult] = useState<{
    css: string;
    stories: Record<string, StorySnapshot>;
  }>({ css: "", stories: {} });
  useEffect(() => {
    const requestId = crypto.randomUUID();
    const frame = () =>
      document.querySelector<HTMLIFrameElement>("iframe.magazine-frame");
    const request = () =>
      frame()?.contentWindow?.postMessage(
        {
          type: "stories-thumbnail-request",
          requestId,
          ids: key.split("|").filter(Boolean),
        },
        "*",
      );
    function receive(event: MessageEvent) {
      if (event.source !== frame()?.contentWindow) return;
      if (event.data?.type === "magazine-ready") request();
      if (
        event.data?.type === "stories-thumbnail-result" &&
        event.data.requestId === requestId
      )
        setResult({ css: event.data.css, stories: event.data.stories });
    }
    window.addEventListener("message", receive);
    request();
    return () => window.removeEventListener("message", receive);
  }, [key]);
  const sheet = useMemo(() => {
    if (!result.css) return null;
    const value = new CSSStyleSheet();
    value.replaceSync(
      result.css.replace(/:root/g, ":host") +
        ":host{font-family:'ECU Poppins',sans-serif;pointer-events:none} .page{margin:0!important;zoom:1!important;transform:scale(.079375);transform-origin:top left;box-shadow:none!important;outline:none!important}",
    );
    return value;
  }, [result.css]);
  // Font faces must be registered outside shadow roots. This adds only existing
  // magazine font definitions, once; page styles remain isolated from the editor.
  const fonts = useMemo(
    () => result.css.match(/@font-face\s*\{[^}]*\}/g)?.join("\n") ?? "",
    [result.css],
  );
  return { stories: result.stories, sheet, fonts };
}
export function StoryThumbnail({
  snapshot,
  sheet,
}: {
  snapshot?: StorySnapshot;
  sheet: CSSStyleSheet | null;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "200px" },
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!host.current) return;
    updateThumbnail(host.current, visible ? snapshot : undefined, sheet);
  }, [snapshot, sheet, visible]);
  return (
    <span
      ref={host}
      className="story-opening-thumbnail"
      aria-hidden="true"
      inert
    />
  );
}

function updateThumbnail(
  host: HTMLElement,
  snapshot: StorySnapshot | undefined,
  sheet: CSSStyleSheet | null,
) {
  const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  root.replaceChildren();
  if (!snapshot || !sheet) return;
  root.adoptedStyleSheets = [sheet];
  const template = document.createElement("template");
  // Trusted DOM snapshot from our sandboxed renderer, never arbitrary pasted HTML.
  template.innerHTML = snapshot.html;
  root.append(template.content);
}
