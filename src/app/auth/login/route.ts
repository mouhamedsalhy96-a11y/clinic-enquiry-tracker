import { getRequestOrigin } from "@/lib/request-origin";
import { NextResponse } from "next/server";
import { login } from "@/lib/login";
export async function POST(request: Request) {
  const expectedOrigin = getRequestOrigin(request);
  if (!expectedOrigin) return new Response("Invalid request origin.", { status: 403 });
  const target = new URL("/login", expectedOrigin);
  let result = { error: "Invalid form.", reason: "invalid" };
  if (request.headers.get("content-type")?.split(";")[0] === "application/x-www-form-urlencoded") {
    // Bound the body even if Content-Length is absent.
    const reader = request.body?.getReader();
    let body = "";
    let bytes = 0;
    const decoder = new TextDecoder();
    if (reader) {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 16384) { await reader.cancel(); return new Response("Form too large.", { status: 413 }); }
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
    }
    const form = new FormData();
    for (const [name, value] of new URLSearchParams(body)) form.append(name, value);
    result = await login(form);
  }
  if (result.error) target.searchParams.set("reason", result.reason);
  else target.pathname = "/staff";
  const response = NextResponse.redirect(target, 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

