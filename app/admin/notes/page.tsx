import { deleteAdminNoteAction, saveAdminNoteAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { requireAdmin } from "@/lib/auth";
import { listAdminNotes } from "@/lib/data";

export default async function AdminNotesPage() {
  await requireAdmin();
  const notes = await listAdminNotes();

  return (
    <AdminShell current="/admin/notes" title="메모장" description="관리자 메모를 여러 개 저장하고 수정합니다.">
      <div className="stack">
        <form action={saveAdminNoteAction} className="panel" style={{ padding: 20 }}>
          <h3>새 메모 추가</h3>
          <div className="field">
            <label className="label" htmlFor="new-note-content">
              내용
            </label>
            <textarea className="textarea" id="new-note-content" name="content" />
          </div>
          <div className="actions">
            <AdminSubmitButton idleText="메모 추가" pendingText="저장 중..." />
          </div>
        </form>

        <div className="list">
          {notes.length === 0 ? (
            <div className="empty-card">
              <h3>저장된 메모가 없습니다</h3>
              <p className="muted" style={{ marginBottom: 0 }}>
                위 입력창에서 첫 번째 메모를 추가해 보세요.
              </p>
            </div>
          ) : (
            notes.map((note, index) => (
              <div key={note.id} className="list-item">
                <div className="list-item-header" style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: 0 }}>메모 {notes.length - index}</h3>
                  <form action={deleteAdminNoteAction}>
                    <input type="hidden" name="id" value={note.id} />
                    <AdminSubmitButton className="danger-button" idleText="삭제" pendingText="삭제 중..." />
                  </form>
                </div>

                <form action={saveAdminNoteAction} className="stack">
                  <input type="hidden" name="id" value={note.id} />
                  <div className="field">
                    <label className="label" htmlFor={`note-${note.id}`}>
                      내용
                    </label>
                    <textarea className="textarea" id={`note-${note.id}`} name="content" defaultValue={note.content} />
                  </div>
                  <div className="actions">
                    <AdminSubmitButton idleText="수정 저장" pendingText="저장 중..." />
                  </div>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminShell>
  );
}
