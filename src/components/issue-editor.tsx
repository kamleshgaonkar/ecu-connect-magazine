"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Save,
  Pencil,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Trash2,
  FileText,
  Check,
  Bold,
  Italic,
  BookOpen,
} from "lucide-react";
import { Shell, Empty } from "./shell";
import { CoverControls, StoryVisualControls } from "./visual-controls";
import { MediaPicker } from "./media-picker";
import { Preview } from "./preview";
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
  id,
  move,
  newStory,
  sectionNames,
  templates,
  type Issue,
  type Section,
  type Story,
  type Block,
} from "../domain/issue";
type View =
  | { kind: "details" }
  | { kind: "section"; sectionId: string }
  | { kind: "story"; sectionId: string; storyId: string };
function initialView(issue: Issue | null, sectionId?: string, storyId?: string) {
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
    [view, setView] = useState<View>({ kind: "details" }),
    [sectionType, setSectionType] = useState<string>(sectionNames[0]);
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
  function addSection() {
    if (!issue) return;
    const s: Section = {
      id: id(),
      name: sectionType,
      enabled: true,
      template:
        sectionType === "Cover Story"
          ? "feature"
          : sectionType === "Notice Board"
            ? "bulletin"
            : "dispatch",
      theme: "inherit",
      stories: [],
    };
    update({ ...issue, sections: [...issue.sections, s] });
    setView({ kind: "section", sectionId: s.id });
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
                  className="back-link"
                  onClick={(e) => {
                    if (
                      dirty &&
                      !window.confirm("Leave without saving your changes?")
                    )
                      e.preventDefault();
                  }}
                >
                  <ArrowLeft size={16} /> All Magazines
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
              preview={<Preview issue={issue} activeStoryId={activeStory} />}
            >
              <div className="editor-layout">
                <nav className="editor-outline" aria-label="Magazine structure">
                  <button
                    className="outline-item outline-details"
                    aria-current={view.kind === "details" ? "true" : undefined}
                    onClick={() => setView({ kind: "details" })}
                  >
                    <BookOpen size={18} />
                    <span>
                      Magazine Details
                      <small>Title, cover and design</small>
                    </span>
                  </button>
                  <div className="outline-heading">
                    <h2>Sections</h2>
                    <span>{issue.sections.length}</span>
                  </div>
                  {issue.sections.length === 0 && (
                    <p className="helper">
                      Choose a section type below to start your edition.
                    </p>
                  )}
                  <ol className="outline-sections">
                    {issue.sections.map((s, index) => {
                      const expanded = section?.id === s.id;
                      return (
                        <li
                          key={s.id}
                          className={expanded ? "expanded" : undefined}
                        >
                          <div className="outline-row">
                            <button
                              className="outline-item outline-section"
                              aria-expanded={expanded}
                              aria-current={
                                expanded && view.kind === "section"
                                  ? "true"
                                  : undefined
                              }
                              onClick={() => openSection(s)}
                            >
                              <ChevronRight
                                size={16}
                                className="outline-chevron"
                              />
                              <span>
                                {s.name || "Untitled section"}
                                <small>
                                  {s.stories.length}{" "}
                                  {s.stories.length === 1 ? "story" : "stories"}
                                  {s.enabled ? "" : " · Hidden"}
                                </small>
                              </span>
                            </button>
                            <div className="outline-order">
                              <button
                                className="icon-button"
                                aria-label={`Move ${s.name} up`}
                                disabled={index === 0}
                                onClick={() =>
                                  update({
                                    ...issue,
                                    sections: move(issue.sections, index, -1),
                                  })
                                }
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                className="icon-button"
                                aria-label={`Move ${s.name} down`}
                                disabled={index === issue.sections.length - 1}
                                onClick={() =>
                                  update({
                                    ...issue,
                                    sections: move(issue.sections, index, 1),
                                  })
                                }
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>
                          </div>
                          {expanded && (
                            <ul
                              className="outline-stories"
                              aria-label={`Stories in ${s.name}`}
                            >
                              {s.stories.map((item) => (
                                <li key={item.id}>
                                  <button
                                    className="outline-item outline-story"
                                    aria-current={
                                      story?.id === item.id ? "true" : undefined
                                    }
                                    onClick={() => openStory(s, item)}
                                  >
                                    <span>
                                      {item.title || "Untitled story"}
                                      {!item.enabled && <small>Hidden</small>}
                                    </span>
                                  </button>
                                </li>
                              ))}
                              <li>
                                <button
                                  className="outline-add"
                                  onClick={() => addStory(s)}
                                >
                                  <Plus size={16} /> Add story
                                </button>
                              </li>
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  <div className="add-section">
                    <label>
                      New section type
                      <select
                        value={sectionType}
                        onChange={(e) => setSectionType(e.target.value)}
                      >
                        {sectionNames.map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <button className="button secondary" onClick={addSection}>
                      <Plus size={16} /> Add section
                    </button>
                  </div>
                </nav>
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
                            next.enabled && section.enabled
                              ? next.id
                              : undefined,
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
                                template: e.target
                                  .value as Section["template"],
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
                              This section is ready for a story. Use Add story
                              in the list to start writing.
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
  sectionName,
  index,
  count,
  onChange,
  onMove,
  onRemove,
  onBack,
}: {
  story: Story;
  sectionName: string;
  index: number;
  count: number;
  onChange: (s: Story) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
  onBack: () => void;
}) {
  const textareas = useRef<Record<string, HTMLTextAreaElement | null>>({});
  function format(block: Block, mark: string) {
    const field = textareas.current[block.id];
    if (!field) return;
    const start = field.selectionStart,
      end = field.selectionEnd;
    const chosen = block.text.slice(start, end) || "text";
    blockChange({
      ...block,
      text:
        block.text.slice(0, start) +
        mark +
        chosen +
        mark +
        block.text.slice(end),
    });
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(
        start + mark.length,
        start + mark.length + chosen.length,
      );
    });
  }
  function blockChange(next: Block) {
    onChange({
      ...story,
      blocks: story.blocks.map((b) => (b.id === next.id ? next : b)),
    });
  }
  return (
    <article
      className="detail-panel story-editor"
      data-story-id={story.id}
      aria-label="Story editor"
    >
      <div className="detail-header">
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
      <label>
        Introduction
        <textarea
          rows={3}
          value={story.subtitle}
          maxLength={500}
          placeholder="A short standfirst that introduces the story"
          onChange={(e) => onChange({ ...story, subtitle: e.target.value })}
        />
      </label>
      <div className="story-meta-row">
        <label>
          Author
          <input
            value={story.byline}
            maxLength={150}
            placeholder="Author or editorial team"
            onChange={(e) => onChange({ ...story, byline: e.target.value })}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={story.enabled}
            onChange={(e) => onChange({ ...story, enabled: e.target.checked })}
          />
          Include this story in preview and PDF
        </label>
      </div>
      <section className="story-content" aria-label="Story content">
        <div className="block-heading">
          <h3>Story content</h3>
          <span>
            {words(story).toLocaleString()} words · Select text, then use Bold
            or Italic
          </span>
        </div>
        {story.blocks.map((block, i) => (
          <div className="content-block" key={block.id}>
            <div className="block-toolbar">
              <label>
                <span className="sr-only">Block {i + 1} type</span>
                <select
                  value={block.type}
                  onChange={(e) =>
                    blockChange({
                      ...block,
                      type: e.target.value as Block["type"],
                    })
                  }
                >
                  <option value="paragraph">Paragraph</option>
                  <option value="heading">Heading</option>
                  <option value="quote">Pull quote</option>
                  <option value="list">Bullet list</option>
                  <option value="figure">Image</option>
                  <option value="callout">Callout</option>
                </select>
              </label>
              <div className="inline-actions">
                <button
                  className="icon-button"
                  aria-label={`Bold in block ${i + 1}`}
                  title="Bold"
                  onClick={() => format(block, "**")}
                >
                  <Bold size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Italic in block ${i + 1}`}
                  title="Italic"
                  onClick={() => format(block, "*")}
                >
                  <Italic size={17} />
                </button>
                <span className="toolbar-divider" aria-hidden="true" />
                <button
                  className="icon-button"
                  aria-label={`Move block ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() =>
                    onChange({ ...story, blocks: move(story.blocks, i, -1) })
                  }
                >
                  <ChevronUp size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Move block ${i + 1} down`}
                  disabled={i === story.blocks.length - 1}
                  onClick={() =>
                    onChange({ ...story, blocks: move(story.blocks, i, 1) })
                  }
                >
                  <ChevronDown size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Remove block ${i + 1}`}
                  onClick={() =>
                    onChange({
                      ...story,
                      blocks: story.blocks.filter((b) => b.id !== block.id),
                    })
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            {block.type === "figure" && (
              <div className="figure-fields">
                <MediaPicker
                  label={`Image in block ${i + 1}`}
                  value={block.image}
                  onChange={(image) => blockChange({ ...block, image })}
                />
                <label>
                  Image {i + 1} height (mm)
                  <input
                    type="number"
                    min={20}
                    max={180}
                    value={block.figureHeightMm ?? 100}
                    onChange={(e) =>
                      blockChange({
                        ...block,
                        figureHeightMm: Math.max(
                          20,
                          Math.min(180, Number(e.target.value)),
                        ),
                      })
                    }
                  />
                </label>
                <p className="helper">
                  Choose “Show complete image” for charts and screenshots.
                  Caption and credit stay with the image. Text below is an
                  optional additional caption.
                </p>
              </div>
            )}
            <label>
              <span className="sr-only">Block {i + 1} text</span>
              <textarea
                ref={(el) => {
                  textareas.current[block.id] = el;
                }}
                className={block.type === "heading" ? "heading-input" : ""}
                rows={block.type === "paragraph" ? 6 : 3}
                maxLength={20000}
                placeholder={
                  block.type === "list"
                    ? "One item per line…"
                    : block.type === "figure"
                      ? "Optional additional caption…"
                      : "Write your story…"
                }
                value={block.text}
                onChange={(e) =>
                  blockChange({ ...block, text: e.target.value })
                }
              />
            </label>
            {block.type === "list" && (
              <small>Each line becomes a separate bullet.</small>
            )}
          </div>
        ))}
        <div className="block-add">
          <button
            className="button secondary"
            disabled={story.blocks.length >= 100}
            onClick={() =>
              onChange({
                ...story,
                blocks: [
                  ...story.blocks,
                  { id: id(), type: "paragraph", text: "" },
                ],
              })
            }
          >
            <Plus size={16} /> Add content block
          </button>
        </div>
      </section>
      <div className="story-options">
        <StoryVisualControls story={story} onChange={onChange} />
        <StoryDesignControls story={story} onChange={onChange} />
        <StoryAdvancedLayout story={story} onChange={onChange} />
      </div>
    </article>
  );
}
