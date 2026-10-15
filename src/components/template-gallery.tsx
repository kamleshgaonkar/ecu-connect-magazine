"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Shell } from "./shell";
import { CreateDialog } from "./create-dialog";
import { studioLayouts, type StudioLayout } from "../studio/layout-catalog";
import { issueRepository } from "../repositories/issues";
import type { Issue } from "../domain/issue";

export function TemplateGallery() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [chosen, setChosen] = useState<StudioLayout | null>(null);
  const [magazineId, setMagazineId] = useState("");
  const [storyId, setStoryId] = useState("");
  useEffect(() => {
    issueRepository
      .list()
      .then(setIssues)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const magazine = issues.find((item) => item.id === magazineId) ?? issues[0];
  const stories =
    magazine?.sections
      .filter((section) => section.enabled)
      .flatMap((section) =>
        section.stories
          .filter((story) => story.enabled)
          .map((story) => ({ ...story, section: section.name })),
      ) ?? [];
  const needsStory = chosen?.action === "opener" || chosen?.action === "t04";
  const selectedStory =
    stories.find((story) => story.id === storyId) ?? stories[0];
  const visible = studioLayouts.filter(
    (layout) =>
      (filter === "all" ||
        (filter === "available" ? !!layout.action : !layout.action)) &&
      (layout.name + " " + layout.description)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function openEditorWithLayout() {
    if (!chosen?.action || !magazine || (needsStory && !selectedStory)) return;
    const params = new URLSearchParams({ layout: chosen.action });
    if (needsStory && selectedStory) params.set("story", selectedStory.id);
    router.push(
      "/issues/" + encodeURIComponent(magazine.id) + "?" + params.toString(),
    );
  }
  return (
    <Shell>
      <main className="templates-main">
        <div className="page-heading">
          <div>
            <p className="studio-kicker">YOUR DESIGN LIBRARY</p>
            <h1>Page Templates</h1>
            <p>Find the right layout for your next story.</p>
          </div>
          <Link href="/" className="button secondary">
            Back to Magazines
          </Link>
        </div>
        <p className="gallery-explainer">
          These thumbnails show the original published magazine pages. Available
          layouts support the features listed below. Other layouts are for
          reference only.
        </p>
        <div className="gallery-toolbar">
          <div
            className="gallery-filters"
            role="group"
            aria-label="Filter layouts"
          >
            {[
              ["all", "All layouts"],
              ["available", "Available"],
              ["soon", "Coming soon"],
            ].map(([value, label]) => (
              <button
                className="button secondary"
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Search page templates"
              placeholder="Search layouts"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="layout-gallery">
          {visible.map((layout) => (
            <article
              className="layout-card"
              key={layout.id}
              data-layout={layout.id}
            >
              <div className="layout-thumbnail">
                <Image
                  src={"/template-thumbnails/" + layout.id + ".webp"}
                  width={500}
                  height={708}
                  alt={layout.name + " — original reference page"}
                  unoptimized
                  sizes="(max-width: 600px) 90vw, 300px"
                />
              </div>
              <div className="layout-card-body">
                <span className="layout-status-badge">
                  {layout.action ? "Available" : "Coming soon"}
                </span>
                <h2>{layout.name}</h2>
                <p>{layout.description}</p>
                <span className="reference-source">
                  Reference · Volume {layout.volume}, page {layout.page}
                </span>
                {layout.action ? (
                  <button
                    className="button primary"
                    aria-label={"Use This Layout: " + layout.name}
                    onClick={() => {
                      setChosen(layout);
                      setMagazineId("");
                      setStoryId("");
                    }}
                  >
                    Use This Layout
                  </button>
                ) : (
                  <p className="layout-unavailable">Not available to use yet</p>
                )}
              </div>
            </article>
          ))}
        </div>
        {!visible.length && (
          <p className="empty-state">No layouts match your search.</p>
        )}
        {chosen && (
          <CreateDialog onClose={() => setChosen(null)}>
            <button
              className="icon-button close-modal"
              aria-label="Close layout selection"
              onClick={() => setChosen(null)}
            >
              <X size={20} />
            </button>
            <h2 id="create-heading">Use {chosen.name}</h2>
            <p>{chosen.note}</p>
            {loading ? (
              <p>Loading your magazines…</p>
            ) : !issues.length ? (
              <p>
                Create a magazine first.{" "}
                <Link href="/" className="text-link">
                  Go to Magazines
                </Link>
              </p>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  openEditorWithLayout();
                }}
              >
                <label>
                  Choose magazine
                  <select
                    value={magazine?.id ?? ""}
                    onChange={(event) => {
                      setMagazineId(event.target.value);
                      setStoryId("");
                    }}
                  >
                    {issues.map((issue) => (
                      <option key={issue.id} value={issue.id}>
                        {issue.title}
                      </option>
                    ))}
                  </select>
                </label>
                {needsStory && (
                  <label>
                    Choose story
                    <select
                      value={selectedStory?.id ?? ""}
                      onChange={(event) => setStoryId(event.target.value)}
                      disabled={!stories.length}
                    >
                      {stories.length ? (
                        stories.map((story) => (
                          <option key={story.id} value={story.id}>
                            {story.section} · {story.title}
                          </option>
                        ))
                      ) : (
                        <option value="">
                          Add a story to this magazine first
                        </option>
                      )}
                    </select>
                  </label>
                )}
                {needsStory && (
                  <p>
                    Your text and images stay in place. Save Magazine in the
                    editor to keep the layout change.
                  </p>
                )}
                <button
                  className="button primary"
                  disabled={!magazine || (needsStory && !selectedStory)}
                  type="submit"
                >
                  {needsStory ? "Apply Layout" : "Open Settings"}
                </button>
              </form>
            )}
          </CreateDialog>
        )}
      </main>
    </Shell>
  );
}
