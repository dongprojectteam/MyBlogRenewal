import Link from "next/link";
import { ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";

const links = [
  { href: "/admin/dashboard", label: "대시보드" },
  { href: "/admin/profile", label: "소개 페이지" },
  { href: "/admin/visualizations", label: "유틸 관리" },
  { href: "/admin/notes", label: "메모장" },
  { href: "/admin/files", label: "파일 관리" },
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
          <div className="brand-subtitle">홈, 소개, 파일과 메타데이터를 관리합니다</div>
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
              <h2 style={{ marginBottom: 8 }}>관리 메뉴</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                직접 만든 유틸과 개인 소개 페이지를 여기서 관리합니다.
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
