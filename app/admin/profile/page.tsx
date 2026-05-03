import {
  deleteProfileLinkAction,
  deleteProfileProjectAction,
  saveProfileLinkAction,
  saveProfileProjectAction,
} from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { ProfilePhoto } from "@/components/profile-photo";
import { ProfilePhotoUploadForm } from "@/components/profile-photo-upload-form";
import { ProfileTextForm } from "@/components/profile-text-form";
import { requireAdmin } from "@/lib/auth";
import { getProfileBundle, getProfilePhotoUrl } from "@/lib/data";

const photoMessages: Record<string, { tone: "success" | "error"; text: string }> = {
  success: { tone: "success", text: "프로필 사진이 저장되었습니다." },
  missing_file: { tone: "error", text: "업로드할 이미지를 선택해 주세요." },
  missing_profile: { tone: "error", text: "프로필 정보를 찾을 수 없습니다." },
  upload_failed: { tone: "error", text: "프로필 사진 업로드 중 오류가 발생했습니다." },
};

export default async function AdminProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const bundle = await getProfileBundle();
  const photoUrl = await getProfilePhotoUrl(bundle.profile.photo_path);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const photoKey = typeof resolvedSearchParams?.photo === "string" ? resolvedSearchParams.photo : "";
  const photoMessage = photoMessages[photoKey];

  return (
    <AdminShell current="/admin/profile" title="소개 페이지 관리" description="소개 문구, 사진, 프로젝트, 외부 링크를 수정합니다.">
      <div className="stack">
        <div className="panel" style={{ padding: 20 }}>
          <h3>프로필 본문</h3>
          <ProfileTextForm profile={bundle.profile} />
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <h3>프로필 사진</h3>
          {photoMessage ? (
            <div className={photoMessage.tone === "success" ? "notice notice-success" : "notice notice-error"}>
              {photoMessage.text}
            </div>
          ) : null}
          <div className="profile-grid" style={{ alignItems: "start" }}>
            <ProfilePhoto url={photoUrl} />
            <ProfilePhotoUploadForm profileId={bundle.profile.id} />
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
              <AdminSubmitButton idleText="프로젝트 추가" pendingText="저장 중..." />
            </div>
          </form>

          <div className="list" style={{ marginTop: 18 }}>
            {bundle.projects.map((project) => (
              <div key={project.id} className="list-item">
                <div className="list-item-header" style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: 0 }}>기존 프로젝트 수정</h3>
                  <form action={deleteProfileProjectAction}>
                    <input type="hidden" name="id" value={project.id} />
                    <AdminSubmitButton className="danger-button" idleText="삭제" pendingText="삭제 중..." />
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
                    <AdminSubmitButton idleText="수정 저장" pendingText="저장 중..." />
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
                <label className="label">이름</label>
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
              <AdminSubmitButton idleText="링크 추가" pendingText="저장 중..." />
            </div>
          </form>

          <div className="list" style={{ marginTop: 18 }}>
            {bundle.links.map((link) => (
              <div key={link.id} className="list-item">
                <div className="list-item-header" style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: 0 }}>기존 링크 수정</h3>
                  <form action={deleteProfileLinkAction}>
                    <input type="hidden" name="id" value={link.id} />
                    <AdminSubmitButton className="danger-button" idleText="삭제" pendingText="삭제 중..." />
                  </form>
                </div>
                <form action={saveProfileLinkAction} className="stack">
                  <input type="hidden" name="id" value={link.id} />
                  <div className="form-row">
                    <div className="field">
                      <label className="label">이름</label>
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
                    <AdminSubmitButton idleText="수정 저장" pendingText="저장 중..." />
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
