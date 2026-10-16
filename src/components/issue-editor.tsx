"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Save,
  Pencil,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Trash2,
  FileText,
  Check,
} from "lucide-react";
import { Shell, Empty } from "./shell";
import { CoverControls, StoryVisualControls } from "./visual-controls";
import { Preview, type PreviewPageSelection } from "./preview";
import { HeadlineControls, StoryBadgeControls } from "./headline-controls";
import { BackgroundDesign } from "./background-design";
import { GridEditor } from "./grid-editor";
import { toggleMagazineVisibility } from "../studio/visibility";
import { StoriesPanel } from "./stories-panel";
import { reorderMagazine, type StoryDrag } from "../studio/reorder";
import { SplitWorkspace } from "./split-workspace";
import { applyStudioLayout } from "../studio/apply-layout";
import {
  IssueDesignControls,
  SectionDesignControls,
  StoryDesignControls,
  StoryAdvancedLayout,
} from "./design-controls";
import { layoutNames, layoutDescriptions } from "../studio/layout-catalog";
import { issueRepository } from "../repositories/issues";
import {
  move,
  newStory,
  newSection,
  templates,
  type Issue,
  type Section,
  type Story,
} from "../domain/issue";
type View =
  | { kind: "details" }
  | { kind: "section"; sectionId: string }
  | { kind: "story"; sectionId: string; storyId: string };
function initialView(
  issue: Issue | null,
  sectionId?: string,
  storyId?: string,
) {
  const section =
    issue?.sections.find((s) => s.id === sectionId) ?? issue?.sections[0];
  if (!section) return { kind: "details" } as View;
  const story =
    section.stories.find((s) => s.id === storyId) ??
    (storyId ? undefined : section.stories[0]);
  return story
    ? ({ kind: "story", sectionId: section.id, storyId: story.id } as View)
    : ({ kind: "section", sectionId: section.id } as View);
}
function words(story: Story) {
  return story.blocks.reduce(
    (n, b) => n + (b.text.match(/\S+/g)?.length ?? 0),
    0,
  );
}
export function IssueEditor({ issueId }: { issueId: string }) {
  const router = useRouter();
  const [previewPage, setPreviewPage] = useState<PreviewPageSelection>(null);
  function selectPreviewPage(next: PreviewPageSelection) {
    if (!next || !issue) return;
    const target = issue.sections.find(
      (s) =>
        s.enabled && s.stories.some((t) => t.id === next.storyId && t.enabled),
    );
    const selected = target?.stories.find((t) => t.id === next.storyId);
    if (!target || !selected) return;
    setView({ kind: "story", sectionId: target.id, storyId: selected.id });
    setActiveStory(selected.id);
    setPreviewClick((value) => value + 1);
    setPreviewPage((previous) =>
      previous?.storyId === next?.storyId && previous?.index === next?.index
        ? previous
        : next,
    );
  }
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});
  const [previewClick, setPreviewClick] = useState(0);
  const [issue, setIssue] = useState<Issue | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [layoutNotice, setLayoutNotice] = useState(""),
    [requestedPanel, setRequestedPanel] = useState<string | undefined>(
      undefined,
    ),
    [status, setStatus] = useState("Saved locally"),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false),
    [activeStory, setActiveStory] = useState<string | undefined>(undefined),
    [view, setView] = useState<View>({ kind: "details" });
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    issueRepository
      .get(issueId)
      .then((data) => {
        if (!active) return;
        const action = params.get("layout");
        const request =
          data && action
            ? applyStudioLayout(data, action, params.get("story") ?? undefined)
            : null;
        const loaded = request?.issue ?? data;
        setIssue(loaded);
        const start =
          request?.target === "cover-design"
            ? ({ kind: "details" } as View)
            : initialView(loaded, request?.sectionId, request?.storyId);
        setView(start);
        if (start.kind === "story") {
          const section = loaded?.sections.find(
            (s) => s.id === start.sectionId,
          );
          const story = section?.stories.find((s) => s.id === start.storyId);
          if (section?.enabled && story?.enabled) setActiveStory(story.id);
        }
        if (request) {
          if (request.error) setError(request.error);
          if (request.notice) setLayoutNotice(request.notice);
          setRequestedPanel(request.target);
          if (request.storyId) setActiveStory(request.storyId);
          if (request.dirty) {
            setDirty(true);
            setStatus("Unsaved changes");
          }
          params.delete("layout");
          params.delete("story");
          window.history.replaceState(
            window.history.state,
            "",
            window.location.pathname +
              (params.size ? "?" + params.toString() : ""),
          );
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [issueId]);
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const loadedIssueId = issue?.id;
  useEffect(() => {
    if (!requestedPanel || !loadedIssueId) return;
    const target = document.getElementById(requestedPanel);
    if (target instanceof HTMLDetailsElement) target.open = true;
    target?.scrollIntoView({ block: "start" });
  }, [requestedPanel, loadedIssueId]);
  function update(next: Issue) {
    setIssue(next);
    setDirty(true);
    setStatus("Unsaved changes");
  }
  async function save() {
    if (!issue) return;
    setSaving(true);
    setError("");
    try {
      const next = { ...issue, updatedAt: new Date().toISOString() };
      await issueRepository.save(next);
      setIssue(next);
      setDirty(false);
      setStatus("Saved locally");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }
  function changeSection(next: Section) {
    if (issue)
      update({
        ...issue,
        sections: issue.sections.map((s) => (s.id === next.id ? next : s)),
      });
  }
  function addSection(sectionType: string) {
    if (!issue) return;
    const s = newSection(sectionType);
    update({ ...issue, sections: [...issue.sections, s] });
    openStory(s, s.stories[0]);
  }
  function addStory(target: Section) {
    const story = newStory();
    changeSection({ ...target, stories: [...target.stories, story] });
    openStory(target, story);
  }
  function openSection(target: Section) {
    setView({ kind: "section", sectionId: target.id });
    setActiveStory(
      target.enabled
        ? target.stories.find((story) => story.enabled)?.id
        : undefined,
    );
  }
  function openStory(target: Section, story: Story) {
    setPreviewPage({ storyId: story.id, index: 0 });
    setView({ kind: "story", sectionId: target.id, storyId: story.id });
    setActiveStory(story.enabled && target.enabled ? story.id : undefined);
  }
  async function removeIssue() {
    if (
      !issue ||
      !window.confirm(
        "Delete this magazine from this browser? This cannot be undone.",
      )
    )
      return;
    try {
      await issueRepository.remove(issue.id);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete issue");
    }
  }
  const section =
    view.kind === "details"
      ? undefined
      : issue?.sections.find((s) => s.id === view.sectionId);
  const story =
    view.kind === "story"
      ? section?.stories.find((s) => s.id === view.storyId)
      : undefined;
  const storyIndex = story && section ? section.stories.indexOf(story) : -1;
  return (
    <Shell
      editor
      onNavigate={(event) => {
        if (dirty && !window.confirm("Leave without saving your changes?"))
          event.preventDefault();
      }}
    >
      <main className="editor-main live-editor-main">
        {loading ? (
          <Empty>Loading magazine…</Empty>
        ) : !issue ? (
          <Empty>
            {error || "This magazine was not found on this device."}
          </Empty>
        ) : (
          <>
            <div className="page-heading editor-heading">
              <div className="editor-title">
                <Link
                  href="/"
                  className="back-link workspace-home"
                  onClick={(e) => {
                    if (
                      dirty &&
                      !window.confirm("Leave without saving your changes?")
                    )
                      e.preventDefault();
                  }}
                >
                  ECU Connect
                </Link>
                <h1>{issue.title}</h1>
                <p className="save-status" role="status">
                  <span className="draft-badge">
                    Volume {issue.volume} · Draft
                  </span>
                  {dirty ? <Pencil size={14} /> : <Check size={14} />} {status}{" "}
                  · Stored in this browser
                </p>
              </div>
              <div className="editor-actions">
                <div id="workspace-export" />
                <button
                  className="button primary"
                  onClick={save}
                  disabled={saving || !dirty}
                >
                  <Save size={17} />
                  {saving ? "Saving…" : "Save Magazine"}
                </button>
                <button
                  className="icon-button"
                  aria-label="Delete magazine"
                  onClick={removeIssue}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {layoutNotice && (
              <p className="studio-notice" role="status">
                {layoutNotice}
              </p>
            )}
            <SplitWorkspace
              stories={
                <StoriesPanel
                  issue={issue}
                  sectionId={section?.id}
                  storyId={story?.id}
                  details={view.kind === "details"}
                  previewClick={previewClick}
                  onDetails={() => setView({ kind: "details" })}
                  onSection={openSection}
                  onStory={openStory}
                  onAddStory={addStory}
                  onAddSection={addSection}
                  onMoveSection={(index, direction) =>
                    update({
                      ...issue,
                      sections: move(issue.sections, index, direction),
                    })
                  }
                  onVisibility={(targetSection, targetStory) => {
                    const next = toggleMagazineVisibility(
                      issue,
                      targetSection,
                      targetStory,
                    );
                    if (next === issue) return;
                    update(next);
                    if (view.kind === "story") {
                      const selectedSection = next.sections.find(
                        (s) => s.id === view.sectionId,
                      );
                      const selected = selectedSection?.stories.find(
                        (s) => s.id === view.storyId,
                      );
                      setActiveStory(
                        selectedSection?.enabled && selected?.enabled
                          ? selected.id
                          : undefined,
                      );
                    }
                  }}
                  onReorder={(source: StoryDrag, target, before, edge) => {
                    const next = reorderMagazine(
                      issue,
                      source,
                      target,
                      before,
                      edge,
                    );
                    if (next === issue) return;
                    update(next);
                    if (
                      source.kind === "story" &&
                      view.kind === "story" &&
                      view.storyId === source.id
                    ) {
                      setView({
                        kind: "story",
                        sectionId: target,
                        storyId: source.id,
                      });
                      const destination = next.sections.find(
                        (s) => s.id === target,
                      );
                      setActiveStory(
                        destination?.enabled &&
                          destination.stories.find((s) => s.id === source.id)
                            ?.enabled
                          ? source.id
                          : undefined,
                      );
                    }
                  }}
                />
              }
              preview={
                <Preview
                  issue={issue}
                  activeStoryId={activeStory}
                  selectedPage={previewPage}
                  onPageSelect={selectPreviewPage}
                  onPageCounts={setPageCounts}
                />
              }
            >
              <div className="editor-detail">
                {view.kind === "details" ? (
                  <section
                    className="detail-panel"
                    aria-labelledby="details-heading"
                  >
                    <h2 id="details-heading">Magazine Details</h2>
                    <div className="settings-grid">
                      <label>
                        Magazine title
                        <input
                          value={issue.title}
                          maxLength={150}
                          onChange={(e) =>
                            update({ ...issue, title: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Volume
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={issue.volume}
                          onChange={(e) =>
                            update({
                              ...issue,
                              volume: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Publication date
                        <input
                          placeholder="e.g. October 2026"
                          maxLength={50}
                          value={issue.date}
                          onChange={(e) =>
                            update({ ...issue, date: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={issue.sample}
                        onChange={(e) =>
                          update({ ...issue, sample: e.target.checked })
                        }
                      />{" "}
                      Label this edition as sample / not approved
                    </label>
                    {issue.sample && (
                      <p className="sample-notice">
                        Volume 21 is fictional demonstration content. Replace
                        and verify it before publication.
                      </p>
                    )}
                    <CoverControls issue={issue} onChange={update} />
                    <IssueDesignControls issue={issue} onChange={update} />
                  </section>
                ) : view.kind === "story" && section && story ? (
                  <StoryEditor
                    key={story.id}
                    story={story}
                    pageIndex={
                      previewPage?.storyId === story.id &&
                      previewPage.index < (pageCounts[story.id] ?? 0)
                        ? previewPage.index
                        : null
                    }
                    pageSelectionRequest={previewClick}
                    sectionName={section.name}
                    index={storyIndex}
                    count={section.stories.length}
                    onBack={() => openSection(section)}
                    onChange={(next) => {
                      changeSection({
                        ...section,
                        stories: section.stories.map((s) =>
                          s.id === next.id ? next : s,
                        ),
                      });
                      if (next.enabled !== story.enabled)
                        setActiveStory(
                          next.enabled && section.enabled ? next.id : undefined,
                        );
                    }}
                    onMove={(d) =>
                      changeSection({
                        ...section,
                        stories: move(section.stories, storyIndex, d),
                      })
                    }
                    onRemove={() => {
                      if (
                        window.confirm("Remove this story and its content?")
                      ) {
                        changeSection({
                          ...section,
                          stories: section.stories.filter(
                            (s) => s.id !== story.id,
                          ),
                        });
                        setView({ kind: "section", sectionId: section.id });
                      }
                    }}
                  />
                ) : section ? (
                  <section
                    className="detail-panel section-settings"
                    aria-labelledby="section-heading"
                  >
                    <div className="detail-header">
                      <div>
                        <p className="detail-kicker">Section</p>
                        <h2 id="section-heading">Section Details</h2>
                      </div>
                      <button
                        className="icon-button"
                        aria-label="Remove section"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remove “${section.name}” and all its stories?`,
                            )
                          ) {
                            const rest = issue.sections.filter(
                              (s) => s.id !== section.id,
                            );
                            update({ ...issue, sections: rest });
                            setView(
                              rest[0]
                                ? { kind: "section", sectionId: rest[0].id }
                                : { kind: "details" },
                            );
                          }
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="section-fields">
                      <label>
                        Section name
                        <input
                          value={section.name}
                          maxLength={150}
                          onChange={(e) =>
                            changeSection({
                              ...section,
                              name: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Page Layout
                        <select
                          value={section.template}
                          onChange={(e) =>
                            changeSection({
                              ...section,
                              template: e.target.value as Section["template"],
                            })
                          }
                        >
                          {templates.map((t) => (
                            <option key={t} value={t}>
                              {layoutNames[t]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <SectionDesignControls
                        section={section}
                        onChange={changeSection}
                      />
                    </div>
                    <p className="helper">
                      {layoutDescriptions[section.template]}
                    </p>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={section.enabled}
                        onChange={(e) =>
                          changeSection({
                            ...section,
                            enabled: e.target.checked,
                          })
                        }
                      />{" "}
                      Include in this magazine
                    </label>
                    <div className="section-stories">
                      <h3>
                        Stories <span>{section.stories.length}</span>
                      </h3>
                      {section.stories.length === 0 ? (
                        <Empty>
                          <FileText size={28} />
                          <p>
                            This section is ready for a story. Use Add story in
                            the list to start writing.
                          </p>
                        </Empty>
                      ) : (
                        <ol>
                          {section.stories.map((item, i) => (
                            <li key={item.id}>
                              <span className="section-story-index">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span className="section-story-title">
                                {item.title || "Untitled story"}
                                <small>
                                  {words(item).toLocaleString()} words
                                  {item.enabled ? "" : " · Hidden"}
                                </small>
                              </span>
                              <button
                                className="button secondary"
                                aria-label={`Edit ${item.title || "untitled story"}`}
                                onClick={() => openStory(section, item)}
                              >
                                Edit
                              </button>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </section>
                ) : (
                  <Empty>
                    <FileText size={30} />
                    <h3>Build your edition, one section at a time</h3>
                    <p>Select a section type and add it to your magazine.</p>
                  </Empty>
                )}
              </div>
            </SplitWorkspace>
          </>
        )}
      </main>
    </Shell>
  );
}
function StoryEditor({
  story,
  pageIndex,
  sectionName,
  pageSelectionRequest,
  index,
  count,
  onChange,
  onMove,
  onRemove,
  onBack,
}: {
  story: Story;
  pageIndex: number | null;
  pageSelectionRequest: number;
  sectionName: string;
  index: number;
  count: number;
  onChange: (s: Story) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
  onBack: () => void;
}) {
  return (
    <article
      className="detail-panel story-editor"
      data-story-id={story.id}
      aria-label="Story editor"
    >
      <div className="detail-header" hidden style={{ display: "none" }}>
        <nav className="breadcrumb" aria-label="Story location">
          <button className="text-button" onClick={onBack}>
            {sectionName || "Untitled section"}
          </button>
          <ChevronRight size={14} aria-hidden="true" />
          <span>
            Story {String(index + 1).padStart(2, "0")} of {count}
          </span>
        </nav>
        <div className="inline-actions">
          <button
            className="icon-button"
            aria-label="Move story up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Move story down"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Remove story"
            onClick={onRemove}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <label className="title-field">
        Headline
        <input
          value={story.title}
          maxLength={200}
          placeholder="Story headline"
          onChange={(e) => onChange({ ...story, title: e.target.value })}
        />
      </label>
      <HeadlineControls story={story} onChange={onChange} />
      <label>
        Subheadline
        <textarea
          rows={3}
          value={story.subtitle}
          maxLength={500}
          placeholder="A short standfirst that introduces the story"
          onChange={(e) => onChange({ ...story, subtitle: e.target.value })}
        />
      </label>
      <StoryBadgeControls story={story} onChange={onChange} />
      <div className="story-meta-row">
        <label>
          Author
          <input
            value={story.byline}
            maxLength={150}
            placeholder="Name | Email"
            onChange={(e) => onChange({ ...story, byline: e.target.value })}
          />
        </label>
      </div>
      <BackgroundDesign
        story={story}
        pageIndex={pageIndex}
        onChange={onChange}
      />
      <GridEditor
        story={story}
        onChange={onChange}
        structureOnly
        pageSelection={pageIndex}
        pageSelectionRequest={pageSelectionRequest}
      />
      {/* Keep advanced editors mounted but hidden for later restoration. */}
      <div hidden>
        <div className="story-options">
          <StoryVisualControls story={story} onChange={onChange} />
          <StoryDesignControls story={story} onChange={onChange} />
          <StoryAdvancedLayout story={story} onChange={onChange} />
        </div>
      </div>
    </article>
  );
}
