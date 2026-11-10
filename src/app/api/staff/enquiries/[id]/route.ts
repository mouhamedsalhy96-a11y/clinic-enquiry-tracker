import { getRequestOrigin } from "@/lib/request-origin";
import { saveNote, saveStatus } from "@/lib/staff-mutations";
import { StaffApiError } from "@/lib/staff-api";
import type { EnquiryStatus } from "@/lib/enquiries";
type Context = { params: Promise<{ id: string }> };
async function mutate(request: Request, context: Context, operation: "note" | "status") {
  const expectedOrigin = getRequestOrigin(request);
  if (!expectedOrigin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return Response.json({ error: "Use a JSON request." }, { status: 415 });
  try {
    let body = "", size = 0;
    const reader = request.body?.getReader();
    const decoder = new TextDecoder();
    if (reader) {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 8192) { await reader.cancel(); return Response.json({ error: "Request too large." }, { status: 413 }); }
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
    }
    let input;
    try { input = JSON.parse(body); } catch { return Response.json({ error: "Invalid form data." }, { status: 400 }); }
    if (!input || typeof input !== "object" || Array.isArray(input)) return Response.json({ error: "Invalid form data." }, { status: 400 });
    const { id } = await context.params;
    const result = operation === "note" ? await saveNote(id, input.text) : await saveStatus(id, input.status as EnquiryStatus);
    return Response.json(result, { status: result.error ? 422 : 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof StaffApiError ? error.message : "Unable to save. Your draft has been kept; please retry." },
      { status: error instanceof StaffApiError ? error.status : 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
export async function POST(request: Request, context: Context) { return mutate(request, context, "note"); }
export async function PATCH(request: Request, context: Context) { return mutate(request, context, "status"); }
