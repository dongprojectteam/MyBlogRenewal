import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { listUploadedFiles } from "@/lib/data";
import { formatBytes } from "@/lib/utils";

const fileErrorMessages: Record<string, string> = {
  missing_file: "업로드할 파일을 선택해 주세요.",
  upload_failed: "파일 업로드 중 오류가 발생했습니다. Supabase Storage 설정과 버킷 이름을 확인해 주세요.",
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
      description="파일을 업로드하고, 저장된 파일을 다운로드합니다."
    >
      <div className="stack">
        {errorMessage ? <div className="notice">{errorMessage}</div> : null}

        <form
          action="/admin/files/upload"
          method="post"
          encType="multipart/form-data"
          className="panel"
          style={{ padding: 20 }}
        >
          <h3>파일 업로드</h3>
          <div className="field">
            <label className="label">파일 선택</label>
            <input className="file-input" type="file" name="file" />
          </div>
          <div className="actions">
            <button className="button" type="submit">
              업로드
            </button>
          </div>
        </form>

        <div className="panel" style={{ padding: 20 }}>
          <h3>업로드된 파일</h3>
          {files.length === 0 ? (
            <p className="muted" style={{ marginBottom: 0 }}>
              업로드된 파일이 없습니다.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>파일명</th>
                  <th>크기</th>
                  <th>다운로드</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id}>
                    <td>{file.file_name}</td>
                    <td>{formatBytes(file.file_size)}</td>
                    <td>
                      <a className="button" href={`/admin/files/download?id=${file.id}`}>
                        download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
