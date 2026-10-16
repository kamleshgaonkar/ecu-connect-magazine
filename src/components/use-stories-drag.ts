import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import type { Issue } from "../domain/issue";
import type { StoryDrag } from "../studio/reorder";
export type StoriesDrop = {
  sectionId: string;
  beforeStoryId?: string;
  sectionEdge?: "before" | "after";
};
type Point = { left: number; top: number; width: number };
type Session = {
  source: StoryDrag;
  label: string;
  pointerId?: number;
  handle: HTMLButtonElement;
  startY: number;
  y: number;
  x: number;
  active: boolean;
  keyboard: boolean;
  box: Point;
  target: StoriesDrop | null;
  frame: number;
};
function same(a: StoriesDrop | null, b: StoriesDrop | null) {
  return (
    a?.sectionId === b?.sectionId &&
    a?.beforeStoryId === b?.beforeStoryId &&
    a?.sectionEdge === b?.sectionEdge
  );
}
function sectionNode(root: HTMLElement, id: string) {
  return Array.from(
    root.querySelectorAll<HTMLElement>("[data-section-id]"),
  ).find((el) => el.dataset.sectionId === id);
}
function storyNode(root: HTMLElement, id: string) {
  return Array.from(
    root.querySelectorAll<HTMLElement>("[data-story-row]"),
  ).find((el) => el.dataset.storyRow === id);
}
export function storyDropSlots(issue: Issue, source: StoryDrag): StoriesDrop[] {
  if (source.kind === "section") {
    const sections = issue.sections.filter((s) => s.id !== source.id);
    return [
      ...sections.map((s) => ({
        sectionId: s.id,
        sectionEdge: "before" as const,
      })),
      ...(sections.length
        ? [{ sectionId: sections.at(-1)!.id, sectionEdge: "after" as const }]
        : []),
    ];
  }
  return issue.sections
    .filter((s) => s.id === source.sectionId || s.stories.length < 50)
    .flatMap((s) => [
      ...s.stories
        .filter((story) => story.id !== source.id)
        .map((story) => ({ sectionId: s.id, beforeStoryId: story.id })),
      { sectionId: s.id },
    ]);
}
/** One pointer sensor, one insertion target. The live list is never reordered during drag. */
export function useStoriesDrag(
  root: RefObject<HTMLElement | null>,
  issue: Issue,
  onReorder: (
    source: StoryDrag,
    target: string,
    before?: string,
    edge?: "before" | "after",
  ) => void,
  onStart: () => void,
) {
  const latest = useRef({ issue, onReorder, onStart });
  useEffect(() => {
    latest.current = { issue, onReorder, onStart };
  }, [issue, onReorder, onStart]);
  const session = useRef<Session | null>(null),
    ghost = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    source: StoryDrag;
    label: string;
    box: Point;
    offset: number;
  } | null>(null);
  const [indicator, setIndicator] = useState<
    (Point & { target: StoriesDrop }) | null
  >(null);
  const [announcement, setAnnouncement] = useState("");
  const place = useCallback(
    (target: StoriesDrop | null) => {
      const state = session.current,
        nav = root.current;
      if (!state || !nav) return;
      state.target = target;
      if (!target) {
        setIndicator(null);
        return;
      }
      const section = sectionNode(nav, target.sectionId);
      if (!section) return;
      const header = section.querySelector<HTMLElement>(".outline-row")!;
      const item = target.beforeStoryId
        ? storyNode(nav, target.beforeStoryId)
        : null;
      const end = section.querySelector<HTMLElement>(".story-end-drop");
      const rect =
        state.source.kind === "section"
          ? section.getBoundingClientRect()
          : (item?.getBoundingClientRect() ??
            end?.getBoundingClientRect() ??
            header.getBoundingClientRect());
      const box = (
        state.source.kind === "section" ? header : (item ?? end ?? header)
      ).getBoundingClientRect();
      const top =
        state.source.kind === "section"
          ? target.sectionEdge === "after"
            ? rect.bottom
            : rect.top
          : item || end
            ? rect.top
            : rect.bottom;
      setIndicator((previous) =>
        previous &&
        same(previous.target, target) &&
        Math.abs(previous.top - top) < 0.25 &&
        previous.left === box.left
          ? previous
          : { left: box.left, top, width: box.width, target },
      );
    },
    [root],
  );
  const locate = useCallback(() => {
    const state = session.current,
      nav = root.current;
    if (!state || !nav) return null;
    const scroll = nav.closest<HTMLElement>(".workspace-stories")!;
    const bounds = scroll.getBoundingClientRect();
    if (
      state.x < bounds.left ||
      state.x > bounds.right ||
      state.y < bounds.top - 45 ||
      state.y > bounds.bottom + 45
    )
      return null;
    const sections = Array.from(
      nav.querySelectorAll<HTMLElement>("[data-section-id]"),
    );
    if (state.source.kind === "section") {
      const candidates = sections.filter(
        (el) => el.dataset.sectionId !== state.source.id,
      );
      const before = candidates.find((el) => {
        const r = el.querySelector(".outline-row")!.getBoundingClientRect();
        return state.y < r.top + r.height / 2;
      });
      return before
        ? {
            sectionId: before.dataset.sectionId!,
            sectionEdge: "before" as const,
          }
        : candidates.length
          ? {
              sectionId: candidates.at(-1)!.dataset.sectionId!,
              sectionEdge: "after" as const,
            }
          : null;
    }
    const section =
      sections.find((el) => state.y < el.getBoundingClientRect().bottom) ??
      sections.at(-1);
    if (!section) return null;
    const destination = latest.current.issue.sections.find(
      (s) => s.id === section.dataset.sectionId,
    )!;
    if (
      destination.id !== state.source.sectionId &&
      destination.stories.length >= 50
    )
      return null;
    const items = Array.from(
      section.querySelectorAll<HTMLElement>("[data-story-row]"),
    ).filter((el) => el.dataset.storyRow !== state.source.id);
    const before = items.find((el) => {
      const r = el.getBoundingClientRect();
      return state.y < r.top + r.height / 2;
    });
    return {
      sectionId: destination.id,
      beforeStoryId: before?.dataset.storyRow,
    };
  }, [root]);
  const stop = useCallback(
    (commit: boolean) => {
      const state = session.current;
      if (!state) return;
      cancelAnimationFrame(state.frame);
      session.current = null;
      setDragging(null);
      setIndicator(null);
      if (
        state.pointerId !== undefined &&
        state.handle.hasPointerCapture(state.pointerId)
      )
        state.handle.releasePointerCapture(state.pointerId);
      if (commit && state.active && state.target) {
        latest.current.onReorder(
          state.source,
          state.target.sectionId,
          state.target.beforeStoryId,
          state.target.sectionEdge,
        );
        setAnnouncement(
          "Finished moving " + state.label + ". Save Magazine to keep changes.",
        );
      } else if (state.active)
        setAnnouncement("Move cancelled. Magazine order is unchanged.");
      requestAnimationFrame(() => {
        if (state.handle.isConnected)
          state.handle.focus({ preventScroll: true });
        else if (state.target && root.current)
          sectionNode(root.current, state.target.sectionId)
            ?.querySelector<HTMLButtonElement>(".section-toggle")
            ?.focus({ preventScroll: true });
      });
    },
    [root],
  );
  useEffect(() => {
    const cancel = () => stop(false);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && session.current) {
        event.preventDefault();
        cancel();
      }
    };
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("blur", cancel);
      window.removeEventListener("keydown", escape);
      const state = session.current;
      if (state) cancelAnimationFrame(state.frame);
    };
  }, [stop]);
  function activate(state: Session) {
    state.active = true;
    latest.current.onStart();
    setDragging({
      source: state.source,
      label: state.label,
      box: state.box,
      offset: state.y - state.startY,
    });
    setAnnouncement(
      "Moving " +
        state.label +
        ". Use arrow keys to choose a position, Space to drop, or Escape to cancel.",
    );
  }
  function tick() {
    const state = session.current,
      nav = root.current;
    if (!state || !nav || state.keyboard) return;
    if (state.active) {
      if (ghost.current)
        ghost.current.style.transform =
          "translate3d(0," + (state.y - state.startY) + "px,0)";
      const scroll = nav.closest<HTMLElement>(".workspace-stories")!,
        box = scroll.getBoundingClientRect();
      const speed =
        state.y < box.top + 40
          ? -Math.min(16, (box.top + 40 - state.y) / 2)
          : state.y > box.bottom - 40
            ? Math.min(16, (state.y - box.bottom + 40) / 2)
            : 0;
      if (state.x >= box.left && state.x <= box.right && speed)
        scroll.scrollTop += speed;
      place(locate());
    }
    state.frame = requestAnimationFrame(tick);
  }
  function pointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    source: StoryDrag,
    label: string,
  ) {
    if (event.button !== 0 || !event.isPrimary || session.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    const row = event.currentTarget.closest<HTMLElement>(
      source.kind === "section" ? ".outline-row" : "[data-story-row]",
    )!;
    const r = row.getBoundingClientRect();
    const state: Session = {
      source,
      label,
      pointerId: event.pointerId,
      handle: event.currentTarget,
      startY: event.clientY,
      y: event.clientY,
      x: event.clientX,
      active: false,
      keyboard: false,
      box: { left: r.left, top: r.top, width: r.width },
      target: null,
      frame: 0,
    };
    session.current = state;
    state.frame = requestAnimationFrame(tick);
  }
  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = session.current;
    if (!state || state.keyboard || state.pointerId !== event.pointerId) return;
    state.x = event.clientX;
    state.y = event.clientY;
    if (!state.active && Math.abs(state.y - state.startY) >= 5) activate(state);
  }
  function keyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    source: StoryDrag,
    label: string,
  ) {
    if (
      ![" ", "Enter", "ArrowUp", "ArrowDown", "Home", "End", "Escape"].includes(
        event.key,
      )
    )
      return;
    let state = session.current;
    if (!state) {
      if (![" ", "Enter"].includes(event.key)) return;
      event.preventDefault();
      const r = event.currentTarget
        .closest<HTMLElement>(
          source.kind === "section" ? ".outline-row" : "[data-story-row]",
        )!
        .getBoundingClientRect();
      state = {
        source,
        label,
        handle: event.currentTarget,
        startY: r.top,
        y: r.top,
        x: r.left,
        active: false,
        keyboard: true,
        box: { left: r.left, top: r.top, width: r.width },
        target: null,
        frame: 0,
      };
      session.current = state;
      activate(state);
      const slots = storyDropSlots(latest.current.issue, source);
      const section = latest.current.issue.sections.find(
        (s) =>
          s.id === (source.kind === "section" ? source.id : source.sectionId),
      )!;
      const next =
        source.kind === "section"
          ? latest.current.issue.sections[
              latest.current.issue.sections.indexOf(section) + 1
            ]?.id
          : section.stories[
              section.stories.findIndex((s) => s.id === source.id) + 1
            ]?.id;
      const initial =
        source.kind === "section"
          ? (slots.find(
              (s) => s.sectionId === next && s.sectionEdge === "before",
            ) ?? slots.at(-1))
          : slots.find(
              (s) => s.sectionId === section.id && s.beforeStoryId === next,
            );
      place(initial ?? null);
      return;
    }
    if (!state.keyboard) return;
    event.preventDefault();
    if (event.key === "Escape") {
      stop(false);
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      stop(true);
      return;
    }
    const slots = storyDropSlots(latest.current.issue, state.source);
    let at = slots.findIndex((s) => same(s, state!.target));
    at =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? slots.length - 1
          : Math.max(
              0,
              Math.min(
                slots.length - 1,
                at + (event.key === "ArrowUp" ? -1 : 1),
              ),
            );
    const target = slots[at];
    if (!target) return;
    const nav = root.current!;
    const node = target.beforeStoryId
      ? storyNode(nav, target.beforeStoryId)
      : sectionNode(nav, target.sectionId);
    node?.scrollIntoView({ block: "nearest" });
    place(target);
    setAnnouncement(
      "Move " +
        state.label +
        " to " +
        latest.current.issue.sections.find((s) => s.id === target.sectionId)
          ?.name +
        (target.beforeStoryId
          ? ", before " +
            latest.current.issue.sections
              .flatMap((s) => s.stories)
              .find((s) => s.id === target.beforeStoryId)?.title
          : ", at the end") +
        ". Space to drop.",
    );
  }
  return {
    dragging,
    indicator,
    ghost,
    announcement,
    handle: (source: StoryDrag, label: string) => ({
      onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) =>
        pointerDown(e, source, label),
      onPointerMove: pointerMove,
      onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => {
        if (session.current?.pointerId === e.pointerId) {
          if (session.current.active) place(locate());
          stop(true);
        }
      },
      onPointerCancel: () => stop(false),
      onLostPointerCapture: () => {
        if (session.current && !session.current.keyboard) stop(false);
      },
      onKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) =>
        keyDown(e, source, label),
      onDragStart: (e: React.DragEvent) => e.preventDefault(),
    }),
  };
}
