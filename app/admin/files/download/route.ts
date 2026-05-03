import { NextRequest, NextResponse } from "next/server";

import { isAdminRequestAuthenticated } from "@/lib/auth";
import { getFileDownloadUrl } from "@/lib/data";

export async function GET(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.redirect(new URL("/admin/files?error=unauthorized", request.url));
  }

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
