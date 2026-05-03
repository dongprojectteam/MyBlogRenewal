import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/data";

export async function POST(request: NextRequest) {
  await requireAdmin();
  const formData = await request.formData();
  const file = formData.get("file");

  if (file instanceof File) {
    await saveUploadedFile(file);
  }

  return NextResponse.redirect(new URL("/admin/files", request.url));
}
