"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowUpRight,
  Search,
  FileText,
  Layers,
  Clock,
  X,
} from "lucide-react";
import { Shell, Empty } from "./shell";
import { CreateDialog } from "./create-dialog";
import { issueRepository } from "../repositories/issues";
import { newIssue, wordCount, type Issue } from "../domain/issue";
export function Dashboard() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [creating, setCreating] = useState(false);
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
      router.push(`/issues/${issue.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create issue");
    }
  }
  const visible = issues.filter((i) =>
    `${i.title} ${i.volume}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Shell>
      <main className="dashboard">
        <div className="eyebrow">YOUR STORIES, BEAUTIFULLY CONNECTED</div>
        <div className="page-heading">
          <div>
            <h1>Issues</h1>
            <p>Create, curate and bring your next edition to life.</p>
          </div>
          <button className="button primary" onClick={() => setCreating(true)}>
            <Plus size={18} /> Create issue
          </button>
        </div>
        <div className="stats">
          <div>
            <span className="stat-icon">
              <BookIcon />
            </span>
            <div>
              <strong>{issues.length.toString().padStart(2, "0")}</strong>
              <span>Total issues</span>
            </div>
          </div>
          <div>
            <span className="stat-icon peach">
              <FileText size={21} />
            </span>
            <div>
              <strong>{issues.length.toString().padStart(2, "0")}</strong>
              <span>In progress</span>
            </div>
          </div>
          <div>
            <span className="stat-icon green">
              <Layers size={21} />
            </span>
            <div>
              <strong>
                {issues
                  .reduce(
                    (n, i) => n + i.sections.filter((s) => s.enabled).length,
                    0,
                  )
                  .toString()
                  .padStart(2, "0")}
              </strong>
              <span>Active sections</span>
            </div>
          </div>
        </div>
        <div className="list-toolbar">
          <h2>
            Your editions <span>{issues.length}</span>
          </h2>
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Search issues"
              placeholder="Search issues…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <Empty>Loading your workspace…</Empty>
        ) : (
          <div className="issue-grid">
            {visible.map((issue) => (
              <Link
                className="issue-card"
                href={`/issues/${issue.id}`}
                key={issue.id}
              >
                <div className="cover-art">
                  <div className="cover-masthead">
                    ECU <em>Connect</em>
                    <span>THE WORLD, WITHIN REACH.</span>
                  </div>
                  <span className="volume-label">
                    VOL. {issue.volume.toString().padStart(2, "0")}
                  </span>
                  <div className="cover-orbit orbit-one" />
                  <div className="cover-orbit orbit-two" />
                  <div className="cover-lines" />
                  <div className="cover-title">{issue.title}</div>
                  <div className="cover-bottom">
                    <span>{issue.date || "NEW EDITION"}</span>
                    <span>ECU WORLDWIDE ↗</span>
                  </div>
                </div>
                <div className="issue-card-info">
                  <div className="card-meta">
                    <span className="draft-badge">Draft</span>
                    <span>Volume {issue.volume}</span>
                  </div>
                  <h3>{issue.title}</h3>
                  <p>
                    {issue.sections.filter((s) => s.enabled).length} sections{" "}
                    <span>·</span> {wordCount(issue).toLocaleString()} words{" "}
                    {issue.sample && (
                      <span className="sample-label">Sample content</span>
                    )}
                  </p>
                  <div className="card-footer">
                    <span>
                      <Clock size={13} />{" "}
                      {new Date(issue.updatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                    <span className="edit-link">
                      Open issue <ArrowUpRight size={16} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            <button className="new-card" onClick={() => setCreating(true)}>
              <span>
                <Plus size={26} />
              </span>
              <strong>A new story starts here</strong>
              <p>Create a fresh issue and make it yours.</p>
              <span className="text-link">
                Create issue <ArrowUpRight size={15} />
              </span>
            </button>
          </div>
        )}
        {!loading && query && visible.length === 0 && (
          <Empty>No issues match “{query}”.</Empty>
        )}
        <section className="template-section" id="templates">
          <div>
            <div className="eyebrow">A HEAD START FOR EVERY STORY</div>
            <h2>Thoughtful templates. Your voice.</h2>
            <p>Reusable layouts that give every section a place to shine.</p>
          </div>
          <div className="template-grid">
            {[
              [
                "01",
                "Feature",
                "A bold opener, spacious storytelling and pull quotes.",
              ],
              [
                "02",
                "Dispatch",
                "Clear updates and stories from across the network.",
              ],
              [
                "03",
                "Bulletin",
                "Scannable notes, lists and useful information.",
              ],
            ].map(([n, t, d]) => (
              <div className="template-card" key={n}>
                <span>
                  {n} <Layers size={18} />
                </span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>
        <footer className="dashboard-footer">
          Made for the stories that connect us.
          <span>ECU Connect · Editorial workspace</span>
        </footer>
        {creating && (
          <CreateDialog onClose={() => setCreating(false)}>
            <button
              className="icon-button close-modal"
              aria-label="Close create issue"
              onClick={() => setCreating(false)}
            >
              <X size={20} />
            </button>
            <h2 id="create-heading">Create a new issue</h2>
            <p>A blank edition, ready for your stories.</p>
            <form action={create}>
              <label>
                Issue title
                <input
                  name="title"
                  required
                  maxLength={150}
                  autoFocus
                  placeholder="A world of connections"
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
                <Plus size={16} /> Create issue
              </button>
            </form>
          </CreateDialog>
        )}
      </main>
    </Shell>
  );
}
function BookIcon() {
  return <FileText size={21} />;
}
