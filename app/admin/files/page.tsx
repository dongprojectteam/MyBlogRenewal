import { AdminShell } from "@/components/admin-shell";
import { FileGalleryTabs } from "@/components/file-gallery-tabs";
import { FileUploadForm } from "@/components/file-upload-form";
import { requireAdmin } from "@/lib/auth";
import { listUploadedFiles } from "@/lib/data";

const fileErrorMessages: Record<string, string> = {
  missing_file: "Choose a file to upload.",
  missing_file_id: "The file to delete could not be found.",
  upload_failed: "File upload failed. Check the Supabase Storage settings and bucket name.",
  delete_failed: "File deletion failed.",
  unauthorized: "Your login session expired. Please sign in again.",
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
    <AdminShell current="/admin/files" title="Files" description="Upload, download, preview, and delete stored files.">
      <div className="stack">
        {errorMessage ? <div className="notice">{errorMessage}</div> : null}

        <FileUploadForm />

        <FileGalleryTabs files={files} />
      </div>
    </AdminShell>
  );
}
