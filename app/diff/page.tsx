import { SiteHeader } from "@/components/site-header";

export default function DiffPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <div className="panel">
        <div className="eyebrow">utility</div>
        <h1>Diff</h1>
        <p className="muted" style={{ marginBottom: 0 }}>
          이 유틸 페이지는 앞으로 실제 기능을 구현할 자리입니다.
        </p>
      </div>
    </div>
  );
}
