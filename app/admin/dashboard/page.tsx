import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { getAllVisualizations, getLatestAdminNote, getProfileBundle, listAdminNotes, listUploadedFiles } from "@/lib/data";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [visualizations, files, latestNote, allNotes, profile] = await Promise.all([
    getAllVisualizations(),
    listUploadedFiles(),
    getLatestAdminNote(),
    listAdminNotes(),
    getProfileBundle(),
  ]);

  return (
    <AdminShell
      current="/admin/dashboard"
      title="대시보드"
      description="현재 사이트 상태를 한눈에 확인하는 관리자 시작 화면입니다."
    >
      <div className="stats-grid">
        <div className="card">
          <div className="tag neutral">visualizations</div>
          <h2>{visualizations.length}</h2>
          <p className="muted">홈에 등록된 유틸 메타데이터 수</p>
        </div>
        <div className="card">
          <div className="tag neutral">files</div>
          <h2>{files.length}</h2>
          <p className="muted">업로드된 파일 수</p>
        </div>
        <div className="card">
          <div className="tag neutral">projects</div>
          <h2>{profile.projects.length}</h2>
          <p className="muted">소개 페이지에 등록된 프로젝트 수</p>
        </div>
        <div className="card">
          <div className="tag neutral">notes</div>
          <h2>{allNotes.length}</h2>
          <p className="muted">저장된 관리자 메모 수</p>
        </div>
      </div>

      <div className="section panel" style={{ padding: 20 }}>
        <h3>최근 메모</h3>
        <p className="muted" style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
          {latestNote?.content || "저장된 메모가 없습니다."}
        </p>
      </div>
    </AdminShell>
  );
}
