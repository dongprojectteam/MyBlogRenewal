import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { getEnv } from "@/lib/env";

const ADMIN_COOKIE = "dopt_admin_session";

function mmddInSeoul(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${month}${day}`;
}

export function getExpectedAdminPassword() {
  return `${getEnv("PASSWORD")}${mmddInSeoul()}`;
}

export function validateAdminLogin(id: string, password: string) {
  return id === "admin" && password === getExpectedAdminPassword();
}

export async function createAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === "true";
}

export function getAdminCookieName() {
  return ADMIN_COOKIE;
}

export async function requireAdmin() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    redirect("/admin");
  }
}

export function isAdminRequestAuthenticated(request: NextRequest) {
  return request.cookies.get(ADMIN_COOKIE)?.value === "true";
}
