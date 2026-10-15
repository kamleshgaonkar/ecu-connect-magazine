/** Preview-only controls, injected after the unchanged magazine renderer.
 * Scaling begins only after measurement; this code is never sent to PDF export.
 */
export function previewController(renderId: string) {
  let fit = true,
    scale = 1,
    scheduled = false;
  const pages = () =>
    Array.from(document.querySelectorAll<HTMLElement>(".page"));
  function position() {
    const list = pages();
    const index = list.reduce(
      (best, page, i) =>
        Math.abs(page.getBoundingClientRect().top) <
        Math.abs(list[best].getBoundingClientRect().top)
          ? i
          : best,
      0,
    );
    parent.postMessage(
      {
        type: "preview-position",
        renderId,
        page: index + 1,
        zoom: Math.round(scale * 100),
      },
      "*",
    );
  }
  function apply() {
    if (!window.__magazineReady) return;
    if (fit)
      scale = Math.max(
        0.1,
        Math.min(2, (window.innerWidth - 32) / ((210 * 96) / 25.4)),
      );
    const root = document.getElementById("pages")!;
    root.style.padding = "16px";
    root.style.background = "#F5F5F5";
    document.body.style.background = "#F5F5F5";
    for (const page of pages()) page.style.setProperty("zoom", String(scale));
  }
  window.addEventListener("message", (event) => {
    if (
      event.source !== parent ||
      event.data?.type !== "preview-control" ||
      event.data.renderId !== renderId ||
      !window.__magazineReady
    )
      return;
    const oldPage = pages().reduce(
      (best, page, i, list) =>
        Math.abs(page.getBoundingClientRect().top) <
        Math.abs(list[best].getBoundingClientRect().top)
          ? i
          : best,
      0,
    );
    if (event.data.zoom === "fit") fit = true;
    else if (
      typeof event.data.zoom === "number" &&
      Number.isFinite(event.data.zoom)
    ) {
      fit = false;
      scale = Math.max(0.1, Math.min(2, event.data.zoom / 100));
    }
    apply();
    const index =
      typeof event.data.page === "number" && Number.isFinite(event.data.page)
        ? Math.max(
            0,
            Math.min(pages().length - 1, Math.round(event.data.page) - 1),
          )
        : oldPage;
    pages()[index]?.scrollIntoView({ block: "start" });
    position();
  });
  window.addEventListener("resize", () => {
    if (fit) {
      apply();
      position();
    }
  });
  window.addEventListener(
    "scroll",
    () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          position();
        });
      }
    },
    { passive: true },
  );
}
export function withPreviewControls(html: string, renderId: string) {
  return html.replace(
    "</body>",
    "<script>(" +
      previewController.toString() +
      ")(" +
      JSON.stringify(renderId).replace(/</g, "\\u003c") +
      ");</script></body>",
  );
}

/** Dashboard-only presentation of the real cover; never included in exports.
 * Wait for the renderer to finish measuring before applying thumbnail scaling.
 */
export function coverThumbnailController() {
  function fit() {
    if (!window.__magazineReady) { requestAnimationFrame(fit); return; }
    const cover = document.querySelector<HTMLElement>(".page");
    if (!cover) return;
    document.documentElement.style.overflow = "hidden";
    document.body.style.margin = "0";
    const root = document.getElementById("pages")!;
    root.style.padding = "0";
    for (const page of Array.from(root.children)) {
      if (page !== cover) (page as HTMLElement).style.display = "none";
    }
    cover.style.margin = "0";
    cover.style.setProperty("zoom", String(window.innerWidth / ((210 * 96) / 25.4)));
  }
  window.addEventListener("resize", fit);
  fit();
}
export function withCoverThumbnail(html: string) {
  return html.replace("</body>", "<script>(" + coverThumbnailController.toString() + ")();</script></body>");
}
