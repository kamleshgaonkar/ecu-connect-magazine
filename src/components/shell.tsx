import Link from "next/link";
import { BookOpen, LayoutGrid, Layers, ArrowUpRight } from "lucide-react";
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="ECU Connect home">
          <span className="brand-symbol">
            e<span>c</span>u
          </span>
          <span className="brand-sub">WORLDWIDE</span>
        </Link>
        <div className="workspace-label">EDITORIAL WORKSPACE</div>
        <nav aria-label="Main navigation">
          <Link href="/" className="nav-active">
            <LayoutGrid size={18} /> Issues <span className="nav-dot" />
          </Link>
          <Link href="/#templates">
            <Layers size={18} /> Editorial templates
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <BookOpen size={24} />
          <p>
            Good stories.
            <br />
            Stronger connections.
          </p>
          <small>ECU CONNECT MAGAZINE</small>
          <div className="workspace-person">
            <span>EC</span>
            <div>
              Editorial workspace
              <small>
                Local development <ArrowUpRight size={12} />
              </small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            ECU <b>Connect</b> <span className="topbar-divider">/</span>{" "}
            Magazine builder
          </span>
          <span className="local-pill">
            <i /> Local workspace
          </span>
        </header>
        {children}
      </div>
    </div>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
