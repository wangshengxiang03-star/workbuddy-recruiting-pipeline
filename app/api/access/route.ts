import { NextResponse } from "next/server";
import { accessCookieValue, accessIsConfigured } from "../../../lib/access";

export async function POST(request: Request) {
  const form = await request.formData();
  const submitted = String(form.get("code") ?? "");
  const expected = process.env.APP_ACCESS_CODE ?? "";
  const nextPath = safeNextPath(String(form.get("next") ?? "/"));

  if (!accessIsConfigured() || submitted !== expected) {
    return redirect(`/access?error=1&next=${encodeURIComponent(nextPath)}`);
  }

  // Keep the Location header relative. CloudBase terminates HTTPS at its
  // gateway, so request.url can contain the container's internal
  // http://0.0.0.0:3000 origin after a form POST.
  const response = redirect(nextPath);
  response.cookies.set("workbuddy_access", await accessCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
  });
  return response;
}

function redirect(location: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { location },
  });
}

function safeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
