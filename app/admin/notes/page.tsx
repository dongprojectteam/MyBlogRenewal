import { saveAdminNoteAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { getAdminNote } from "@/lib/data";

export default async function AdminNotesPage() {
  await requireAdmin();
  const note = await getAdminNote();

  return (
    <AdminShell current="/admin/notes" title="메모장" description="관리자 전용 메모를 저장하고 수정합니다.">
      <form action={saveAdminNoteAction} className="stack">
        <input type="hidden" name="id" value={note.id} />
        <div className="field">
          <label className="label" htmlFor="note-content">
            내용
          </label>
          <textarea className="textarea" id="note-content" name="content" defaultValue={note.content} />
        </div>
        <div className="actions">
          <button className="button" type="submit">
            저장
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
