import { NextRequest, NextResponse } from "next/server";

import { isAdminRequestAuthenticated } from "@/lib/auth";
import { uploadProfilePhoto } from "@/lib/data";

export async function POST(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.redirect(new URL("/admin?error=invalid_credentials", request.url));
  }

  try {
    const formData = await request.formData();
    const profileId = String(formData.get("profile_id") || "");
    const file = formData.get("photo");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.redirect(new URL("/admin/profile?photo=missing_file", request.url));
    }

    if (!profileId) {
      return NextResponse.redirect(new URL("/admin/profile?photo=missing_profile", request.url));
    }

    await uploadProfilePhoto(file, profileId);
    return NextResponse.redirect(new URL("/admin/profile?photo=success", request.url));
  } catch {
    return NextResponse.redirect(new URL("/admin/profile?photo=upload_failed", request.url));
  }
}
