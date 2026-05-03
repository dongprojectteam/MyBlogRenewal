import { NextRequest, NextResponse } from "next/server";

import { createAdminSession, validateAdminLogin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const id = String(formData.get("id") || "");
  const password = String(formData.get("password") || "");

  if (!id || !password) {
    return NextResponse.redirect(new URL("/admin?error=missing_fields", request.url));
  }

  if (!validateAdminLogin(id, password)) {
    return NextResponse.redirect(new URL("/admin?error=invalid_credentials", request.url));
  }

  await createAdminSession();
  return NextResponse.redirect(new URL("/admin/dashboard", request.url));
}
