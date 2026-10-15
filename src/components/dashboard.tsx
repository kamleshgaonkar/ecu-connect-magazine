"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ArrowUpRight, Search, X } from "lucide-react";
import { Shell, Empty } from "./shell";
import { CoverThumbnail } from "./cover-thumbnail";
import { CreateDialog } from "./create-dialog";
import { issueRepository } from "../repositories/issues";
import { newIssue, wordCount, type Issue } from "../domain/issue";
export function Dashboard() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    issueRepository
      .list()
      .then(setIssues)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function create(form: FormData) {
    try {
      const issue = newIssue(
        String(form.get("title")),
        Number(form.get("volume")),
      );
      await issueRepository.save(issue);
      router.push("/issues/" + issue.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create magazine");
    }
  }
  const visible = issues.filter((issue) =>
    (issue.title + " " + issue.volume)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <Shell>
      <main className="dashboard">
        <div className="page-heading">
          <div>
            <h1>Magazines</h1>
            <p>Open a draft to keep editing, or start a new edition.</p>
          </div>
          <button className="button primary" onClick={() => setCreating(true)}>
            <Plus size={18} />
            Create Magazine
          </button>
        </div>
        <div className="list-toolbar">
          <h2>
            All magazines <span>{issues.length}</span>
          </h2>
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Search magazines"
              placeholder="Search magazines"
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
        {loading ? (
          <Empty>Loading your magazines…</Empty>
        ) : (
          <div className="issue-grid">
            {visible.map((issue) => (
              <Link
                className="issue-card"
                href={"/issues/" + issue.id}
                key={issue.id}
              >
                <div className="volume-summary">
                  <span className="studio-volume-label">VOLUME</span>
                  <strong className="volume-number">{issue.volume}</strong>
                  <span className="publication-date">{issue.date || "Date to be confirmed"}</span>
                </div>
                <div className="dashboard-cover"><CoverThumbnail issue={issue} /></div>
                <div className="issue-card-info">
                  <div className="card-meta">
                    <span className="draft-badge">Draft</span>
                    <span>Saved locally</span>
                  </div>
                  <h3>{issue.cover?.headline || issue.title}</h3>
                  {issue.cover?.headline && issue.cover.headline !== issue.title && <p>{issue.title}</p>}
                  <p>
                    {issue.sections.filter((section) => section.enabled).length}{" "}
                    sections · {wordCount(issue).toLocaleString()} words
                  </p>
                  {issue.sample && (
                    <p className="sample-label">Sample content</p>
                  )}
                  <div className="card-footer">
                    <span>
                      Updated{" "}
                      {new Date(issue.updatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                    <span className="edit-link">
                      Open Magazine <ArrowUpRight size={16} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            <button className="new-card" onClick={() => setCreating(true)}>
              <span>
                <Plus size={24} />
              </span>
              <strong>Create Magazine</strong>
              <p>Start a blank edition and add stories next.</p>
            </button>
          </div>
        )}
        {!loading && query && !visible.length && (
          <Empty>No magazines match “{query}”.</Empty>
        )}
        <section className="studio-template-prompt">
          <div>
            <h2>Page Templates</h2>
            <p>Browse the approved magazine layouts and apply one to a story.</p>
          </div>
          <Link className="button secondary" href="/templates">
            Browse Page Templates <ArrowUpRight size={16} />
          </Link>
        </section>
        {creating && (
          <CreateDialog onClose={() => setCreating(false)}>
            <button
              className="icon-button close-modal"
              aria-label="Close create magazine"
              onClick={() => setCreating(false)}
            >
              <X size={20} />
            </button>
            <h2 id="create-heading">Create Magazine</h2>
            <p>Start with the details. Add stories next.</p>
            <form action={create}>
              <label>
                Magazine title
                <input
                  name="title"
                  required
                  maxLength={150}
                  autoFocus
                  placeholder="Name your magazine"
                />
              </label>
              <label>
                Volume
                <input
                  name="volume"
                  type="number"
                  min={1}
                  max={999}
                  defaultValue={22}
                  required
                />
              </label>
              <button className="button primary" type="submit">
                <Plus size={16} />
                Create Magazine
              </button>
            </form>
          </CreateDialog>
        )}
      </main>
    </Shell>
  );
}
