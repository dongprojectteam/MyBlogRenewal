import { AdminShell } from "@/components/admin-shell";
import { FileGalleryTabs } from "@/components/file-gallery-tabs";
import { FileUploadForm } from "@/components/file-upload-form";
import { requireAdmin } from "@/lib/auth";
import { listUploadedFiles } from "@/lib/data";

const fileErrorMessages: Record<string, string> = {
  missing_file: "업로드할 파일을 선택해 주세요.",
  missing_file_id: "삭제할 파일 정보를 찾을 수 없습니다.",
  upload_failed: "파일 업로드 중 오류가 발생했습니다. Supabase Storage 설정과 버킷 이름을 확인해 주세요.",
  delete_failed: "파일 삭제 중 오류가 발생했습니다.",
  unauthorized: "로그인이 만료되었습니다. 다시 로그인해 주세요.",
};

export default async function AdminFilesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const files = await listUploadedFiles();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorKey = typeof resolvedSearchParams?.error === "string" ? resolvedSearchParams.error : "";
  const errorMessage = fileErrorMessages[errorKey];

  return (
    <AdminShell
      current="/admin/files"
      title="파일 관리"
      description="파일을 업로드하고 저장된 파일을 다운로드하거나 삭제합니다."
    >
      <div className="stack">
        {errorMessage ? <div className="notice">{errorMessage}</div> : null}

        <FileUploadForm />

        <FileGalleryTabs files={files} />
      </div>
    </AdminShell>
  );
}
