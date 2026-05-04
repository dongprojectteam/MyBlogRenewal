import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { UtilityCard } from "@/components/utility-card";
import { getPublicVisualizations } from "@/lib/data";

export default async function HomePage() {
  const items = await getPublicVisualizations();
  const recentItems = items.slice(0, 3);

  return (
    <div className="page-shell">
      <SiteHeader current="home" />

      <section className="hero-panel hero-grid">
        <div>
          <div className="eyebrow">personal space</div>
          <h1 className="hero-title">A quiet archive for things I build.</h1>
          <p className="hero-copy">
            내가 좋아하는 것들, 직접 만든 작은 도구들, 그리고 차분하게 쌓아두고 싶은 기록을 담는 개인 공간입니다.
          </p>
          <div className="actions" style={{ marginTop: 24 }}>
            <Link href="/about" className="button">
              about me
            </Link>
          </div>
        </div>

        <div className="hero-aside">
          <div className="preview-card">
            <div className="tag neutral">Recent updates</div>
            {recentItems.length === 0 ? (
              <p className="muted" style={{ lineHeight: 1.7, marginBottom: 0, marginTop: 12 }}>
                아직 공개된 유틸이 없습니다. 곧 등록되는 것들을 차분히 둘러보세요.
              </p>
            ) : (
              <ul className="hero-recent-list">
                {recentItems.map((item) => (
                  <li key={item.id}>
                    <Link href={item.url} className="hero-recent-link">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Utilities</h2>
        {items.length === 0 ? (
          <div className="empty-card">
            <div className="tag neutral">Empty state</div>
            <h3>아직 등록된 유틸이 없습니다</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              관리자 페이지에서 유틸을 등록하면 이곳에 카드 형태로 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="utility-grid">
            {items.map((item) => (
              <UtilityCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <p className="footer-note">DOPT는 개인 취미와 도구들을 모아두는 조용한 개인 공간을 목표로 합니다.</p>
    </div>
  );
}
