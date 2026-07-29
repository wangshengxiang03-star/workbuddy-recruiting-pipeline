import { NextResponse } from "next/server";
import { accessCookieValue, accessIsConfigured } from "../../../lib/access";

export async function POST(request: Request) {
  const form = await request.formData();
  const submitted = String(form.get("code") ?? "");
  const expected = process.env.APP_ACCESS_CODE ?? "";
  const nextPath = safeNextPath(String(form.get("next") ?? "/"));

  if (!accessIsConfigured() || submitted !== expected) {
    return NextResponse.redirect(
      new URL(`/access?error=1&next=${encodeURIComponent(nextPath)}`, request.url),
      303,
    );
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  response.cookies.set("workbuddy_access", await accessCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
  });
  return response;
}

function safeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
