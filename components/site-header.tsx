import Link from "next/link";

type SiteHeaderProps = {
  current?: "home" | "about";
};

export function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <Link href="/" className="brand-title">
          DOPT
        </Link>
        <div className="brand-subtitle">작은 취미와 유틸을 쌓아두는 개인 공간</div>
      </div>
      <nav className="nav-actions">
        <Link className={current === "home" ? "button" : "ghost-button"} href="/">
          home
        </Link>
        <Link className={current === "about" ? "button" : "ghost-button"} href="/about">
          about
        </Link>
        <Link className="button" href="/admin">
          admin
        </Link>
      </nav>
    </header>
  );
}
