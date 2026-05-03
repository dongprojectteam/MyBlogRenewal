import { NextRequest, NextResponse } from "next/server";

import { isAdminRequestAuthenticated } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/data";

export async function POST(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.redirect(new URL("/admin/files?error=unauthorized", request.url));
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.redirect(new URL("/admin/files?error=missing_file", request.url));
    }

    await saveUploadedFile(file);
    return NextResponse.redirect(new URL("/admin/files", request.url));
  } catch {
    return NextResponse.redirect(new URL("/admin/files?error=upload_failed", request.url));
  }
}
