import "server-only";
import { requireStaff } from "@/lib/staff-api";
import { statuses, type EnquiryStatus } from "@/lib/enquiries";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function saveStatus(id: string, status: EnquiryStatus) {
  const { client, clinicId } = await requireStaff();
  if (!uuid.test(id) || !statuses.includes(status)) return { error: "Invalid enquiry or status." };
  const { data, error } = await client.from("enquiries").update({ status }).eq("id", id).eq("clinic_id", clinicId).select("status, updated_at").single();
  if (error || !data) return { error: "Status was not saved. Refresh the inbox and try again." };
  return { status: data.status as EnquiryStatus, updatedAt: data.updated_at as string };
}
export async function saveNote(id: string, input: string) {
  const { client, user, clinicId } = await requireStaff();
  if (!uuid.test(id) || typeof input !== "string" || !input.trim() || input.trim().length > 1000) return { error: "Write a note between 1 and 1,000 characters." };
  const { data: enquiry, error: accessError } = await client.from("enquiries").select("id").eq("id", id).eq("clinic_id", clinicId).single();
  if (accessError || !enquiry) return { error: "This enquiry is unavailable. Refresh the inbox." };
  const { data, error } = await client.from("enquiry_notes").insert({ enquiry_id: id, author_id: user.id, text: input.trim() }).select("id, text, created_at").single();
  if (error || !data) return { error: "Note was not saved. Your draft is still here; please try again." };
  return { note: { id: data.id as string, text: data.text as string, createdAt: data.created_at as string } };
}

