import { getRequestOrigin, publicSubmissionsEnabled } from "@/lib/request-origin";
import { verifyTurnstile } from "@/lib/turnstile";
import { submitPublicEnquiry } from "@/lib/public-submission";
export async function POST(request: Request) {
  const expectedOrigin = getRequestOrigin(request);
  if (!expectedOrigin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!publicSubmissionsEnabled()) {
    return Response.json({ error: "Public submissions are not enabled on this deployment." }, { status: 503 });
  }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return Response.json({ error: "Use a JSON request." }, { status: 415 });
  const reader = request.body?.getReader();
  let body = "", bytes = 0;
  const decoder = new TextDecoder();
  if (reader) {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 16384) { await reader.cancel(); return Response.json({ error: "Form too large." }, { status: 413 }); }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
  }
  let input;
  try { input = JSON.parse(body); } catch { return Response.json({ error: "Invalid form data." }, { status: 400 }); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return Response.json({ error: "Invalid form data." }, { status: 400 });
  const verification = await verifyTurnstile(input.turnstileToken, new URL(expectedOrigin).hostname);
  if (!verification.ok) return Response.json({ error: verification.error }, { status: verification.status, headers: { "Cache-Control": "private, no-store" } });
  const result = await submitPublicEnquiry(input);
  return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "private, no-store", ...(result.status === 429 ? { "Retry-After": "900" } : {}) } });
}

