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
    <AdminShell current="/admin/dashboard" title="Dashboard" description="A quick overview of the current site state.">
      <div className="stats-grid">
        <div className="card">
          <div className="tag neutral">visualizations</div>
          <h2>{visualizations.length}</h2>
          <p className="muted">Home utility metadata entries</p>
        </div>
        <div className="card">
          <div className="tag neutral">files</div>
          <h2>{files.length}</h2>
          <p className="muted">Uploaded files</p>
        </div>
        <div className="card">
          <div className="tag neutral">projects</div>
          <h2>{profile.projects.length}</h2>
          <p className="muted">Projects shown on the about page</p>
        </div>
        <div className="card">
          <div className="tag neutral">notes</div>
          <h2>{allNotes.length}</h2>
          <p className="muted">Saved admin notes</p>
        </div>
      </div>

      <div className="section panel admin-compact-panel">
        <h3>Latest Note</h3>
        <p className="muted" style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
          {latestNote?.content || "No notes saved yet."}
        </p>
      </div>
    </AdminShell>
  );
}
