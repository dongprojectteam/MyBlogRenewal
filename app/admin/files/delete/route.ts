import { NextRequest, NextResponse } from "next/server";

import { isAdminRequestAuthenticated } from "@/lib/auth";
import { deleteUploadedFile } from "@/lib/data";

export async function POST(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.redirect(new URL("/admin/files?error=unauthorized", request.url));
  }

  try {
    const formData = await request.formData();
    const id = String(formData.get("id") || "");

    if (!id) {
      return NextResponse.redirect(new URL("/admin/files?error=missing_file_id", request.url));
    }

    await deleteUploadedFile(id);
    return NextResponse.redirect(new URL("/admin/files", request.url));
  } catch {
    return NextResponse.redirect(new URL("/admin/files?error=delete_failed", request.url));
  }
}
