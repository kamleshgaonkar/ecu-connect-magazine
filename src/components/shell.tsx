"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, PanelsTopLeft, Files } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
export function Shell({
  children,
  onNavigate,
  editor = false,
}: {
  children: ReactNode;
  editor?: boolean;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const pathname = usePathname();
  if (editor)
    return (
      <div className="studio-shell editor-shell">
        <div className="main-wrap">{children}</div>
      </div>
    );
  return (
    <div className="app-shell studio-shell">
      <aside className="sidebar">
        <Link
          href="/"
          className="brand studio-brand"
          aria-label="ECU Connect home"
          onClick={onNavigate}
        >
          <PanelsTopLeft size={25} />
          <span>
            ECU Connect<small>Magazine Builder</small>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <Link
            href="/"
            onClick={onNavigate}
            className={!pathname.startsWith("/templates") ? "nav-active" : ""}
            aria-current={
              !pathname.startsWith("/templates") ? "page" : undefined
            }
          >
            <LayoutGrid size={19} />
            Magazines
          </Link>
          <Link
            href="/templates"
            onClick={onNavigate}
            className={pathname.startsWith("/templates") ? "nav-active" : ""}
            aria-current={
              pathname.startsWith("/templates") ? "page" : undefined
            }
          >
            <Files size={19} />
            Page Templates
          </Link>
        </nav>
        <p className="studio-device-note">Saved on this device</p>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            ECU Connect <span className="topbar-divider">/</span>{" "}
            <b>
              {pathname.startsWith("/templates")
                ? "Page Templates"
                : pathname.startsWith("/issues")
                  ? "Magazine Editor"
                  : "Magazines"}
            </b>
          </span>
        </header>
        {children}
      </div>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
