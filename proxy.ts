import { NextRequest, NextResponse } from "next/server";
import {
  accessCookieValue,
  accessIsConfigured,
} from "./lib/access";

export async function proxy(request: NextRequest) {
  if (!accessIsConfigured()) return NextResponse.next();

  const current = request.cookies.get("workbuddy_access")?.value;
  const expected = await accessCookieValue();
  if (current === expected) return NextResponse.next();

  const accessUrl = new URL("/access", request.url);
  accessUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: [
    "/((?!access|api/access|_next/static|_next/image|favicon.svg|og.png|og-mvp.png).*)",
  ],
};
