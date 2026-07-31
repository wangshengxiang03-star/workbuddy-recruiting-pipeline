export const ACCESS_COOKIE_NAME = "workbuddy_access";

const ACCESS_COOKIE_VALUE = "granted";

export function accessCodeConfigured() {
  return Boolean(process.env.APP_ACCESS_CODE?.trim());
}

export function accessGranted(value: string | undefined) {
  return value === ACCESS_COOKIE_VALUE;
}

export function accessCookieValue() {
  return ACCESS_COOKIE_VALUE;
}

export function safeRelativePath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://workbuddy.local");
    if (url.origin !== "https://workbuddy.local") return "/";
    if (url.pathname === "/access" || url.pathname === "/api/access") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
