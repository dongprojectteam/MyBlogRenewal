import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getFileDownloadUrl } from "@/lib/data";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.redirect(new URL("/admin/files", request.url));
  }

  const url = await getFileDownloadUrl(id);
  if (!url) {
    return NextResponse.redirect(new URL("/admin/files", request.url));
  }

  return NextResponse.redirect(url);
}
