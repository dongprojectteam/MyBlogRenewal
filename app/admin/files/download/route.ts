import { NextRequest, NextResponse } from "next/server";

import { isAdminRequestAuthenticated } from "@/lib/auth";
import { downloadUploadedFile, getUploadedFileById } from "@/lib/data";

export async function GET(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.redirect(new URL("/admin/files?error=unauthorized", request.url));
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.redirect(new URL("/admin/files", request.url));
  }

  const file = await getUploadedFileById(id);
  if (!file) {
    return NextResponse.redirect(new URL("/admin/files", request.url));
  }

  const blob = await downloadUploadedFile(file.storage_path);
  if (!blob) {
    return NextResponse.redirect(new URL("/admin/files", request.url));
  }

  const headers = new Headers();
  headers.set("Content-Type", file.mime_type || "application/octet-stream");
  headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`);
  headers.set("Cache-Control", "no-store");

  if (file.file_size > 0) {
    headers.set("Content-Length", String(file.file_size));
  }

  return new NextResponse(blob, { headers });
}
