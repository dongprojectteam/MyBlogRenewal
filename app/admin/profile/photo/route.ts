import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { uploadProfilePhoto } from "@/lib/data";

export async function POST(request: NextRequest) {
  await requireAdmin();
  const formData = await request.formData();
  const profileId = String(formData.get("profile_id") || "");
  const file = formData.get("photo");

  if (file instanceof File && profileId) {
    await uploadProfilePhoto(file, profileId);
  }

  return NextResponse.redirect(new URL("/admin/profile", request.url));
}
