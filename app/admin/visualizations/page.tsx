import { deleteVisualizationAction, saveVisualizationAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { getAllVisualizations } from "@/lib/data";

export default async function AdminVisualizationsPage() {
  await requireAdmin();
  const items = await getAllVisualizations();

  return (
    <AdminShell
      current="/admin/visualizations"
      title="유틸 관리"
      description="홈에 노출할 유틸 메타데이터를 등록하고 정렬합니다."
    >
      <div className="stack">
        <form action={saveVisualizationAction} className="panel" style={{ padding: 20 }}>
          <h3>새 유틸 추가</h3>
          <div className="form-row">
            <div className="field">
              <label className="label">제목</label>
              <input className="input" name="title" />
            </div>
            <div className="field">
              <label className="label">URL</label>
              <input className="input" name="url" placeholder="/diff" />
            </div>
          </div>
          <div className="field">
            <label className="label">Image URL (optional)</label>
            <input className="input" name="image_url" placeholder="https://.../preview.png" />
          </div>
          <div className="field">
            <label className="label">설명</label>
            <textarea className="textarea" name="description" />
          </div>
          <div className="form-row">
            <div className="field">
              <label className="label">정렬 순서</label>
              <input className="input" name="sort_order" type="number" defaultValue={0} />
            </div>
            <div className="field" style={{ justifyContent: "flex-end" }}>
              <label className="label">
                <input type="checkbox" name="visible" defaultChecked style={{ marginRight: 8 }} />
                홈에 공개
              </label>
            </div>
          </div>
          <div className="actions">
            <button className="button" type="submit">
              추가
            </button>
          </div>
        </form>

        <div className="list">
          {items.map((item) => (
            <div key={item.id} className="list-item">
              <div className="list-item-header" style={{ marginBottom: 14 }}>
                <h3 style={{ margin: 0 }}>기존 항목 수정</h3>
                <form action={deleteVisualizationAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <button className="danger-button" type="submit">
                    삭제
                  </button>
                </form>
              </div>
              <form action={saveVisualizationAction} className="stack">
                <input type="hidden" name="id" value={item.id} />
                <div className="form-row">
                  <div className="field">
                    <label className="label">제목</label>
                    <input className="input" name="title" defaultValue={item.title} />
                  </div>
                  <div className="field">
                    <label className="label">URL</label>
                    <input className="input" name="url" defaultValue={item.url} />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Image URL (optional)</label>
                  <input className="input" name="image_url" defaultValue={item.image_url ?? ""} />
                </div>
                <div className="field">
                  <label className="label">설명</label>
                  <textarea className="textarea" name="description" defaultValue={item.description} />
                </div>
                <div className="form-row">
                  <div className="field">
                    <label className="label">정렬 순서</label>
                    <input className="input" name="sort_order" type="number" defaultValue={item.sort_order} />
                  </div>
                  <div className="field" style={{ justifyContent: "flex-end" }}>
                    <label className="label">
                      <input type="checkbox" name="visible" defaultChecked={item.visible} style={{ marginRight: 8 }} />
                      홈에 공개
                    </label>
                  </div>
                </div>
                <div className="actions">
                  <button className="button" type="submit">
                    수정 저장
                  </button>
                </div>
              </form>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
