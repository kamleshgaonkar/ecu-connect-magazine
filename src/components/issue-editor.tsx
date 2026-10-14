"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Save,
  Eye,
  Pencil,
  ChevronUp,
  ChevronDown,
  Trash2,
  FileText,
  Check,
} from "lucide-react";
import { Shell, Empty } from "./shell";
import { Preview } from "./preview";
import {
  IssueDesignControls,
  SectionDesignControls,
  StoryDesignControls,
} from "./design-controls";
import { templateRegistry } from "../magazine/templates";
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
export function IssueEditor({ issueId }: { issueId: string }) {
  const router = useRouter();
  const [issue, setIssue] = useState<Issue | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [status, setStatus] = useState("Saved locally"),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false),
    [tab, setTab] = useState<"edit" | "preview">("edit"),
    [selected, setSelected] = useState(""),
    [sectionType, setSectionType] = useState<string>(sectionNames[0]);
  useEffect(() => {
    issueRepository
      .get(issueId)
      .then((data) => {
        setIssue(data);
        setSelected(data?.sections[0]?.id ?? "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
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
    setSelected(s.id);
  }
  async function removeIssue() {
    if (
      !issue ||
      !window.confirm(
        "Delete this issue from this browser? This cannot be undone.",
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
  const section = issue?.sections.find((s) => s.id === selected);
  return (
    <Shell>
      <main className="editor-main">
        <Link
          href="/"
          className="back-link"
          onClick={(e) => {
            if (dirty && !window.confirm("Leave without saving your changes?"))
              e.preventDefault();
          }}
        >
          <ArrowLeft size={15} /> All issues
        </Link>
        {loading ? (
          <Empty>Loading issue…</Empty>
        ) : !issue ? (
          <Empty>{error || "This issue was not found in this browser."}</Empty>
        ) : (
          <>
            <div className="page-heading editor-heading">
              <div>
                <div className="eyebrow">
                  VOLUME {issue.volume}{" "}
                  <span className="draft-badge">DRAFT</span>
                </div>
                <h1>{issue.title}</h1>
                <p className="save-status" role="status">
                  {dirty ? <Pencil size={13} /> : <Check size={13} />} {status}{" "}
                  · Stored in this browser
                </p>
              </div>
              <div className="editor-actions">
                <button
                  className="button primary"
                  onClick={save}
                  disabled={saving || !dirty}
                >
                  <Save size={16} />
                  {saving ? "Saving…" : "Save issue"}
                </button>
                <button
                  className="icon-button"
                  aria-label="Delete issue"
                  onClick={removeIssue}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="editor-tabs" role="tablist" aria-label="Issue view">
              <button
                role="tab"
                id="edit-tab"
                aria-controls="edit-panel"
                aria-selected={tab === "edit"}
                onClick={() => setTab("edit")}
              >
                <Pencil size={16} /> Edit content
              </button>
              <button
                role="tab"
                id="preview-tab"
                aria-controls="preview-panel"
                aria-selected={tab === "preview"}
                onClick={() => setTab("preview")}
              >
                <Eye size={16} /> Preview & export
              </button>
            </div>
            {tab === "preview" ? (
              <div
                role="tabpanel"
                id="preview-panel"
                aria-labelledby="preview-tab"
              >
                <Preview key={JSON.stringify(issue)} issue={issue} />
              </div>
            ) : (
              <div role="tabpanel" id="edit-panel" aria-labelledby="edit-tab">
                <div className="issue-settings panel">
                  <h2>Edition details</h2>
                  <div className="settings-grid">
                    <label>
                      Issue title
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
                          update({ ...issue, volume: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Edition date
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
                  <IssueDesignControls issue={issue} onChange={update} />
                  {issue.sample && (
                    <p className="sample-notice">
                      Volume 21 is fictional demonstration content. Replace and
                      verify it before publication.
                    </p>
                  )}
                </div>
                <div className="editor-grid">
                  <aside className="section-list panel">
                    <div className="panel-heading">
                      <h2>Sections</h2>
                      <span>{issue.sections.length}</span>
                    </div>
                    <p className="muted">
                      Order sections below. Disabled sections are excluded from
                      the magazine.
                    </p>
                    <ol>
                      {issue.sections.map((s, index) => (
                        <li
                          key={s.id}
                          className={s.id === selected ? "selected" : ""}
                        >
                          <button
                            className="section-select"
                            onClick={() => setSelected(s.id)}
                          >
                            <span className="section-index">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span>
                              {s.name}
                              <small>
                                {s.stories.length}{" "}
                                {s.stories.length === 1 ? "story" : "stories"} ·{" "}
                                {s.enabled ? "Included" : "Hidden"}
                              </small>
                            </span>
                          </button>
                          <div className="section-order">
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
                              <ChevronUp size={14} />
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
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <div className="add-section">
                      <label>
                        Section type
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
                        <Plus size={15} /> Add section
                      </button>
                    </div>
                  </aside>
                  <div className="section-content">
                    {section ? (
                      <>
                        <section className="panel section-settings">
                          <div className="panel-heading">
                            <h2>Section settings</h2>
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
                                  setSelected(rest[0]?.id ?? "");
                                }
                              }}
                            >
                              <Trash2 size={16} />
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
                              Editorial template
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
                                    {templateRegistry[t].label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <SectionDesignControls
                            section={section}
                            onChange={changeSection}
                          />
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
                            Include in this issue
                          </label>
                          <p className="muted">
                            {templateRegistry[section.template].description}
                          </p>
                        </section>
                        <div className="stories-heading">
                          <h2>
                            Stories <span>{section.stories.length}</span>
                          </h2>
                          <button
                            className="button secondary"
                            onClick={() =>
                              changeSection({
                                ...section,
                                stories: [...section.stories, newStory()],
                              })
                            }
                          >
                            <Plus size={16} /> Add story
                          </button>
                        </div>
                        {section.stories.length === 0 && (
                          <Empty>
                            <FileText size={30} />
                            <h3>This section is ready for a story</h3>
                            <p>Add a story to start shaping the page.</p>
                          </Empty>
                        )}
                        {section.stories.map((story, index) => (
                          <StoryEditor
                            key={story.id}
                            story={story}
                            index={index}
                            count={section.stories.length}
                            onChange={(next) =>
                              changeSection({
                                ...section,
                                stories: section.stories.map((s) =>
                                  s.id === next.id ? next : s,
                                ),
                              })
                            }
                            onMove={(d) =>
                              changeSection({
                                ...section,
                                stories: move(section.stories, index, d),
                              })
                            }
                            onRemove={() => {
                              if (
                                window.confirm(
                                  "Remove this story and its content?",
                                )
                              )
                                changeSection({
                                  ...section,
                                  stories: section.stories.filter(
                                    (s) => s.id !== story.id,
                                  ),
                                });
                            }}
                          />
                        ))}
                      </>
                    ) : (
                      <Empty>
                        <LayersIcon />
                        <h3>Build your edition, one section at a time</h3>
                        <p>Select a section type and add it to your issue.</p>
                      </Empty>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </Shell>
  );
}
function LayersIcon() {
  return <FileText size={32} />;
}
function StoryEditor({
  story,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  story: Story;
  index: number;
  count: number;
  onChange: (s: Story) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
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
    <section className="story-editor panel">
      <div className="panel-heading">
        <h3>Story {String(index + 1).padStart(2, "0")}</h3>
        <div className="inline-actions">
          <button
            className="icon-button"
            aria-label="Move story up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Move story down"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Remove story"
            onClick={onRemove}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <StoryDesignControls story={story} onChange={onChange} />
      <label>
        Headline
        <input
          value={story.title}
          maxLength={200}
          onChange={(e) => onChange({ ...story, title: e.target.value })}
        />
      </label>
      <label>
        Standfirst / introduction
        <textarea
          rows={2}
          value={story.subtitle}
          maxLength={500}
          onChange={(e) => onChange({ ...story, subtitle: e.target.value })}
        />
      </label>
      <label>
        Byline
        <input
          value={story.byline}
          maxLength={150}
          placeholder="Author or editorial team"
          onChange={(e) => onChange({ ...story, byline: e.target.value })}
        />
      </label>
      <div className="block-heading">
        <h4>Story content</h4>
        <span>Structured blocks · bold & italic supported</span>
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
              </select>
            </label>
            <div className="inline-actions">
              <button
                className="icon-button"
                aria-label={`Bold in block ${i + 1}`}
                onClick={() => format(block, "**")}
              >
                <b>B</b>
              </button>
              <button
                className="icon-button"
                aria-label={`Italic in block ${i + 1}`}
                onClick={() => format(block, "*")}
              >
                <em>I</em>
              </button>
              <button
                className="icon-button"
                aria-label={`Move block ${i + 1} up`}
                disabled={i === 0}
                onClick={() =>
                  onChange({ ...story, blocks: move(story.blocks, i, -1) })
                }
              >
                <ChevronUp size={14} />
              </button>
              <button
                className="icon-button"
                aria-label={`Move block ${i + 1} down`}
                disabled={i === story.blocks.length - 1}
                onClick={() =>
                  onChange({ ...story, blocks: move(story.blocks, i, 1) })
                }
              >
                <ChevronDown size={14} />
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
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <label>
            <span className="sr-only">Block {i + 1} text</span>
            <textarea
              ref={(el) => {
                textareas.current[block.id] = el;
              }}
              className={block.type === "heading" ? "heading-input" : ""}
              rows={block.type === "paragraph" ? 5 : 3}
              maxLength={20000}
              placeholder={
                block.type === "list"
                  ? "One item per line…"
                  : "Write your story…"
              }
              value={block.text}
              onChange={(e) => blockChange({ ...block, text: e.target.value })}
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
          <Plus size={15} /> Add content block
        </button>
        <span>
          {story.blocks.reduce(
            (n, b) => n + (b.text.match(/\S+/g)?.length ?? 0),
            0,
          )}{" "}
          words
        </span>
      </div>
    </section>
  );
}
