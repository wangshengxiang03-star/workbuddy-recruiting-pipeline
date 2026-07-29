export function accessIsConfigured() {
  return Boolean(process.env.APP_ACCESS_CODE?.trim());
}

export async function accessCookieValue() {
  const code = process.env.APP_ACCESS_CODE ?? "";
  const input = new TextEncoder().encode(`workbuddy:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
