import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  accessCookieValue,
  safeRelativePath,
} from "../../lib/access-control";

export const runtime = "edge";

export async function POST(request: Request) {
  const formData = await request.formData();
  const code = String(formData.get("code") ?? "").trim();
  const next = safeRelativePath(String(formData.get("next") ?? "/"));
  const expected = process.env.APP_ACCESS_CODE?.trim();

  if (!expected || code !== expected) {
    const url = new URL("/access", request.url);
    url.searchParams.set("next", next);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: accessCookieValue(),
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
