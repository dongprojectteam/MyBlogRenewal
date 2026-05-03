import {
  deleteProfileLinkAction,
  deleteProfileProjectAction,
  saveProfileLinkAction,
  saveProfileProjectAction,
  saveProfileTextAction,
} from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { ProfilePhoto } from "@/components/profile-photo";
import { requireAdmin } from "@/lib/auth";
import { getProfileBundle, getProfilePhotoUrl } from "@/lib/data";

export default async function AdminProfilePage() {
  await requireAdmin();
  const bundle = await getProfileBundle();
  const photoUrl = await getProfilePhotoUrl(bundle.profile.photo_path);

  return (
    <AdminShell
      current="/admin/profile"
      title="소개 페이지 관리"
      description="소개 문구, 사진, 프로젝트, 외부 링크를 수정합니다."
    >
      <div className="stack">
        <div className="panel" style={{ padding: 20 }}>
          <h3>프로필 본문</h3>
          <form action={saveProfileTextAction} className="stack">
            <input type="hidden" name="id" value={bundle.profile.id} />
            <div className="field">
              <label className="label">인사말</label>
              <input className="input" name="greeting" defaultValue={bundle.profile.greeting} />
            </div>
            <div className="field">
              <label className="label">소개</label>
              <textarea className="textarea" name="bio" defaultValue={bundle.profile.bio} />
            </div>
            <div className="actions">
              <button className="button" type="submit">
                저장
              </button>
            </div>
          </form>
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <h3>프로필 사진</h3>
          <div className="profile-grid" style={{ alignItems: "start" }}>
            <ProfilePhoto url={photoUrl} />
            <form action="/admin/profile/photo" method="post" encType="multipart/form-data" className="stack">
              <input type="hidden" name="profile_id" value={bundle.profile.id} />
              <div className="field">
                <label className="label">이미지 업로드</label>
                <input className="file-input" type="file" name="photo" accept="image/*" />
              </div>
              <button className="button" type="submit">
                사진 업로드
              </button>
            </form>
          </div>
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <h3>프로젝트 추가</h3>
          <form action={saveProfileProjectAction} className="stack">
            <div className="form-row">
              <div className="field">
                <label className="label">제목</label>
                <input className="input" name="title" />
              </div>
              <div className="field">
                <label className="label">URL</label>
                <input className="input" name="project_url" placeholder="/week-calendar" />
              </div>
            </div>
            <div className="field">
              <label className="label">설명</label>
              <textarea className="textarea" name="description" />
            </div>
            <div className="field">
              <label className="label">정렬 순서</label>
              <input className="input" name="sort_order" type="number" defaultValue={0} />
            </div>
            <div className="actions">
              <button className="button" type="submit">
                프로젝트 추가
              </button>
            </div>
          </form>

          <div className="list" style={{ marginTop: 18 }}>
            {bundle.projects.map((project) => (
              <div key={project.id} className="list-item">
                <div className="list-item-header" style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: 0 }}>기존 프로젝트 수정</h3>
                  <form action={deleteProfileProjectAction}>
                    <input type="hidden" name="id" value={project.id} />
                    <button className="danger-button" type="submit">
                      삭제
                    </button>
                  </form>
                </div>
                <form action={saveProfileProjectAction} className="stack">
                  <input type="hidden" name="id" value={project.id} />
                  <div className="form-row">
                    <div className="field">
                      <label className="label">제목</label>
                      <input className="input" name="title" defaultValue={project.title} />
                    </div>
                    <div className="field">
                      <label className="label">URL</label>
                      <input className="input" name="project_url" defaultValue={project.project_url} />
                    </div>
                  </div>
                  <div className="field">
                    <label className="label">설명</label>
                    <textarea className="textarea" name="description" defaultValue={project.description} />
                  </div>
                  <div className="field">
                    <label className="label">정렬 순서</label>
                    <input className="input" name="sort_order" type="number" defaultValue={project.sort_order} />
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

        <div className="panel" style={{ padding: 20 }}>
          <h3>외부 링크 추가</h3>
          <form action={saveProfileLinkAction} className="stack">
            <div className="form-row">
              <div className="field">
                <label className="label">라벨</label>
                <input className="input" name="label" placeholder="LinkedIn" />
              </div>
              <div className="field">
                <label className="label">URL</label>
                <input className="input" name="url" placeholder="https://..." />
              </div>
            </div>
            <div className="field">
              <label className="label">정렬 순서</label>
              <input className="input" name="sort_order" type="number" defaultValue={0} />
            </div>
            <div className="actions">
              <button className="button" type="submit">
                링크 추가
              </button>
            </div>
          </form>

          <div className="list" style={{ marginTop: 18 }}>
            {bundle.links.map((link) => (
              <div key={link.id} className="list-item">
                <div className="list-item-header" style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: 0 }}>기존 링크 수정</h3>
                  <form action={deleteProfileLinkAction}>
                    <input type="hidden" name="id" value={link.id} />
                    <button className="danger-button" type="submit">
                      삭제
                    </button>
                  </form>
                </div>
                <form action={saveProfileLinkAction} className="stack">
                  <input type="hidden" name="id" value={link.id} />
                  <div className="form-row">
                    <div className="field">
                      <label className="label">라벨</label>
                      <input className="input" name="label" defaultValue={link.label} />
                    </div>
                    <div className="field">
                      <label className="label">URL</label>
                      <input className="input" name="url" defaultValue={link.url} />
                    </div>
                  </div>
                  <div className="field">
                    <label className="label">정렬 순서</label>
                    <input className="input" name="sort_order" type="number" defaultValue={link.sort_order} />
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
      </div>
    </AdminShell>
  );
}
