import type { EnquiryNote, EnquiryStatus } from "@/lib/enquiries";
type SaveResult = { error?: string; status?: EnquiryStatus; updatedAt?: string; note?: EnquiryNote };
async function save(id: string, method: "POST" | "PATCH", body: object): Promise<SaveResult> {
  const response = await fetch("/api/staff/enquiries/" + encodeURIComponent(id), {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) return { error: typeof result.error === "string" ? result.error : "Unable to save. Please retry." };
  return result;
}
export function saveStatus(id: string, status: EnquiryStatus) { return save(id, "PATCH", { status }); }
export function saveNote(id: string, text: string) { return save(id, "POST", { text }); }

