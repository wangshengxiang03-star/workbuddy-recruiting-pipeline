import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  accessCodeConfigured,
  accessGranted,
} from "./app/lib/access-control";

const PUBLIC_FILE = /\.(.*)$/;

export function proxy(request: NextRequest) {
  if (!accessCodeConfigured()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (
    pathname === "/access" ||
    pathname === "/api/access" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/og-") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (accessGranted(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "请先输入体验码" }, { status: 401 });
  }

  const accessUrl = request.nextUrl.clone();
  accessUrl.pathname = "/access";
  accessUrl.search = "";
  accessUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
