import Link from "next/link";
import { ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/profile", label: "Profile" },
  { href: "/admin/visualizations", label: "Home content" },
  { href: "/admin/notes", label: "Notes" },
  { href: "/admin/files", label: "Files" },
];

type AdminShellProps = {
  current: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AdminShell({ current, title, description, children }: AdminShellProps) {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand">
          <Link href="/" className="brand-title">
            DOPT Admin
          </Link>
          <div className="brand-subtitle">Manage profile, files, notes, and home content.</div>
        </div>
        <div className="nav-actions">
          <Link className="ghost-button" href="/">
            public home
          </Link>
          <Link className="ghost-button" href="/about">
            public about
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="admin-grid">
        <aside className="panel">
          <div className="stack">
            <div>
              <div className="eyebrow">admin</div>
              <h2 style={{ marginBottom: 8 }}>Menu</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Keep the public home and personal pages organized from one place.
              </p>
            </div>

            <nav className="sidebar-nav">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={current === link.href ? "sidebar-link active" : "sidebar-link"}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <main className="panel">
          <div className="eyebrow">workspace</div>
          <h1 style={{ marginBottom: 8 }}>{title}</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            {description}
          </p>
          <div className="section">{children}</div>
        </main>
      </div>
    </div>
  );
}
