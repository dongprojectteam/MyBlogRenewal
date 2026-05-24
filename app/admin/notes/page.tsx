import { deleteAdminNoteAction, saveAdminNoteAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { requireAdmin } from "@/lib/auth";
import { listAdminNotes } from "@/lib/data";

export default async function AdminNotesPage() {
  await requireAdmin();
  const notes = await listAdminNotes();

  return (
    <AdminShell current="/admin/notes" title="Notes" description="Save and edit private admin notes.">
      <div className="stack">
        <form action={saveAdminNoteAction} className="panel admin-compact-panel">
          <h3>Add Note</h3>
          <div className="field">
            <label className="label" htmlFor="new-note-content">
              Content
            </label>
            <textarea className="textarea" id="new-note-content" name="content" />
          </div>
          <div className="actions">
            <AdminSubmitButton idleText="Add Note" pendingText="Saving..." />
          </div>
        </form>

        <div className="list">
          {notes.length === 0 ? (
            <div className="empty-card">
              <h3>No notes saved</h3>
              <p className="muted" style={{ marginBottom: 0 }}>
                Add the first note from the form above.
              </p>
            </div>
          ) : (
            notes.map((note, index) => (
              <div key={note.id} className="list-item">
                <div className="list-item-header" style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: 0 }}>Note {notes.length - index}</h3>
                  <form action={deleteAdminNoteAction}>
                    <input type="hidden" name="id" value={note.id} />
                    <AdminSubmitButton className="danger-button" idleText="Delete" pendingText="Deleting..." />
                  </form>
                </div>

                <form action={saveAdminNoteAction} className="stack">
                  <input type="hidden" name="id" value={note.id} />
                  <div className="field">
                    <label className="label" htmlFor={`note-${note.id}`}>
                      Content
                    </label>
                    <textarea className="textarea" id={`note-${note.id}`} name="content" defaultValue={note.content} />
                  </div>
                  <div className="actions">
                    <AdminSubmitButton idleText="Save Changes" pendingText="Saving..." />
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
