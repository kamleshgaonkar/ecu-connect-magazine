/** Preview-only presentation. Approved magazine renderer and export remain isolated. */
export function previewController(renderId: string) {
  let fit = true,
    scale = 1,
    scheduled = false,
    fullscreen = false,
    activePage = 1;
  const root = document.getElementById("pages")!;
  const pages = () =>
    Array.from(
      root.querySelectorAll<HTMLElement>(
        ":scope > .page, :scope > .preview-page-stage > .page",
      ),
    );
  const width = (210 * 96) / 25.4,
    height = (297 * 96) / 25.4;
  let strip: HTMLElement | null = null;
  function position() {
    const list = pages();
    activePage =
      list.reduce(
        (best, page, i) =>
          Math.abs(page.getBoundingClientRect().top - 16) <
          Math.abs(list[best].getBoundingClientRect().top - 16)
            ? i
            : best,
        0,
      ) + 1;
    strip?.querySelectorAll("button").forEach((button, i) => {
      button.setAttribute(
        "aria-current",
        i + 1 === activePage ? "page" : "false",
      );
      button.style.outline =
        i + 1 === activePage ? "2px solid #111" : "1px solid #ddd";
    });
    parent.postMessage(
      {
        type: "preview-position",
        renderId,
        page: activePage,
        storyId: list[activePage - 1]?.dataset.storyId ?? null,
        storyPage: Number(list[activePage - 1]?.dataset.storyPage ?? -1),
        zoom: Math.round(scale * 100),
      },
      "*",
    );
  }
  function navigate(index: number) {
    const page = pages()[Math.max(0, Math.min(pages().length - 1, index))];
    (page?.parentElement?.classList.contains("preview-page-stage")
      ? page.parentElement
      : page
    )?.scrollIntoView({ block: "start" });
    position();
    strip
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  function thumbnails() {
    if (strip) return;
    strip = document.createElement("nav");
    strip.id = "page-thumbnails";
    strip.setAttribute("aria-label", "Magazine page thumbnails");
    strip.style.cssText =
      "position:fixed;bottom:0;left:0;right:0;height:132px;display:flex;gap:12px;padding:10px 16px;overflow-x:auto;overflow-y:hidden;background:#fff;border-top:1px solid #e5e5e5;z-index:100;align-items:flex-start;font:12px ECU Poppins,sans-serif;";
    pages().forEach((page, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", "Go to page " + (i + 1));
      button.style.cssText =
        "flex:none;width:72px;height:108px;padding:3px;border:0;border-radius:3px;background:#f5f5f5;color:#111;cursor:pointer;";
      const holder = document.createElement("div");
      holder.style.cssText =
        "height:88px;width:62px;overflow:hidden;margin:auto;pointer-events:none;";
      const clone = page.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      clone.removeAttribute("id");
      clone.setAttribute("aria-hidden", "true");
      clone.style.margin = "0";
      clone.style.setProperty("zoom", String(62 / width));
      clone.style.boxShadow = "none";
      holder.append(clone);
      button.append(holder, document.createTextNode(String(i + 1)));
      button.onclick = () => navigate(i);
      strip!.append(button);
    });
    document.body.append(strip);
  }
  function apply() {
    if (!window.__magazineReady) return;
    const bottom = fullscreen ? 132 : 0;
    if (fit)
      scale = Math.max(
        0.01,
        Math.min(
          2,
          (window.innerWidth - 32) / width,
          (window.innerHeight - bottom - 32) / height,
        ),
      );
    root.style.padding = "16px 16px " + (bottom + 16) + "px";
    root.style.background = "#F5F5F5";
    document.body.style.background = "#F5F5F5";
    document.body.style.margin = "0";
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.alignItems = "center";
    for (const page of pages()) {
      page.style.setProperty("zoom", String(scale));
      let stage = page.parentElement!;
      if (stage === root) {
        stage = document.createElement("div");
        stage.className = "preview-page-stage";
        root.insertBefore(stage, page);
        stage.append(page);
      }
      stage.style.cssText =
        "display:grid;place-items:center;flex:none;width:100%;min-width:" +
        Math.max(0, width * scale) +
        "px;min-height:" +
        Math.max(0, window.innerHeight - bottom - 32) +
        "px;";
    }
    const measured: Record<string, string> = {};
    root
      .querySelectorAll<HTMLElement>(".magazine-grid-cell")
      .forEach((cell) => {
        const id = cell.dataset.gridCell;
        if (id && measured[id] === undefined)
          measured[id] = (cell.textContent ?? "").slice(0, 300);
      });
    parent.postMessage(
      { type: "preview-grid-measured", renderId, cells: measured },
      "*",
    );
    if (fullscreen) thumbnails();
    if (strip) strip.style.display = fullscreen ? "flex" : "none";
  }
  window.addEventListener("message", (event) => {
    if (
      event.source !== parent ||
      event.data?.type !== "preview-control" ||
      event.data.renderId !== renderId ||
      !window.__magazineReady
    )
      return;
    const oldPage = activePage;
    if (typeof event.data.fullscreen === "boolean")
      fullscreen = event.data.fullscreen;
    if (event.data.zoom === "fit") fit = true;
    else if (
      typeof event.data.zoom === "number" &&
      Number.isFinite(event.data.zoom)
    ) {
      fit = false;
      scale = Math.max(0.1, Math.min(2, event.data.zoom / 100));
    }
    apply();
    navigate(
      typeof event.data.page === "number" && Number.isFinite(event.data.page)
        ? Math.round(event.data.page) - 1
        : oldPage - 1,
    );
  });
  window.addEventListener("resize", () => {
    if (fit) {
      apply();
      navigate(activePage - 1);
    }
  });
  window.addEventListener("keydown", (event) => {
    if (!fullscreen) return;
    if (event.key === "Tab" && strip) {
      const buttons = Array.from(strip.querySelectorAll("button"));
      if (
        (event.shiftKey &&
          (document.activeElement === buttons[0] ||
            document.activeElement === document.body)) ||
        (!event.shiftKey && document.activeElement === buttons.at(-1))
      ) {
        event.preventDefault();
        parent.postMessage(
          { type: "preview-focus", renderId, backward: event.shiftKey },
          "*",
        );
      }
    }
    if (event.key === "Escape") {
      parent.postMessage({ type: "preview-close", renderId }, "*");
      return;
    }
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      navigate(
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? pages().length - 1
            : activePage - 1 + (event.key === "ArrowLeft" ? -1 : 1),
      );
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
    if (!window.__magazineReady) {
      requestAnimationFrame(fit);
      return;
    }
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
    cover.style.setProperty(
      "zoom",
      String(window.innerWidth / ((210 * 96) / 25.4)),
    );
  }
  window.addEventListener("resize", fit);
  fit();
}
export function withCoverThumbnail(html: string) {
  return html.replace(
    "</body>",
    "<script>(" + coverThumbnailController.toString() + ")();</script></body>",
  );
}
