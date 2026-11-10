/** Accept only explicitly configured production origins, never forwarded hosts. */
export function getRequestOrigin(request: Request): string | null {
  const value = request.headers.get("origin");
  if (!value) return null;
  let origin: URL;
  try { origin = new URL(value); } catch { return null; }
  if (origin.origin !== value || origin.username || origin.password) return null;
  if (process.env.NODE_ENV !== "production") {
    return origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
      && origin.host === request.headers.get("host") ? origin.origin : null;
  }
  const allowed = new Set<string>();
  if (process.env.APP_ORIGIN) allowed.add(process.env.APP_ORIGIN.replace(/\/$/, ""));
  if (process.env.VERCEL === "1") {
    for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
      if (host && /^[a-z0-9-]+\.vercel\.app$/i.test(host)) allowed.add("https://" + host);
    }
  }
  return origin.protocol === "https:" && allowed.has(origin.origin) ? origin.origin : null;
}
export function publicSubmissionsEnabled(): boolean {
  return process.env.NODE_ENV === "development" || process.env.PUBLIC_SUBMISSIONS_ENABLED === "true";
}
