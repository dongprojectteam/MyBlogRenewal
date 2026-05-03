import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { UtilityCard } from "@/components/utility-card";
import { getPublicVisualizations } from "@/lib/data";

export default async function HomePage() {
  const items = await getPublicVisualizations();

  return (
    <div className="page-shell">
      <SiteHeader current="home" />

      <section className="hero-panel hero-grid">
        <div>
          <div className="eyebrow">personal space</div>
          <h1 className="hero-title">A small space for personal hobbies.</h1>
          <p className="hero-copy">
            이곳은 제가 좋아하는 것들, 직접 만든 작은 유틸, 그리고 차분하게 쌓아두고 싶은 기록을 담는 개인 공간입니다.
          </p>
          <div className="actions" style={{ marginTop: 24 }}>
            <Link href="/about" className="button">
              about me
            </Link>
            <Link href="/admin" className="ghost-button">
              admin
            </Link>
          </div>
        </div>

        <div className="hero-aside">
          <div className="stat-card">
            <div className="tag neutral">Current mood</div>
            <h3 style={{ marginBottom: 10 }}>조용하고 단정한 홈</h3>
            <p className="muted" style={{ lineHeight: 1.7, marginBottom: 0 }}>
              블로그처럼 과하게 꾸미기보다, 개인 취미 공간처럼 느껴지는 밀도의 첫 화면을 목표로 합니다.
            </p>
          </div>
          <div className="preview-card">
            <div className="tag neutral">Navigation</div>
            <p className="muted" style={{ lineHeight: 1.7, marginBottom: 0 }}>
              우측 상단에서 `about`, `admin`으로 이동할 수 있고, 앞으로 추가되는 유틸은 아래 목록에 나타납니다.
            </p>
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

      <p className="footer-note">DOPT는 개인 취미와 유틸을 담아두는 조용한 개인 공간을 목표로 합니다.</p>
    </div>
  );
}
