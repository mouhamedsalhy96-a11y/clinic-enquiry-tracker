import { Suspense } from "react";
import { requireStaff } from "@/lib/staff";
import { StaffInbox } from "@/components/staff-inbox";
import type { Category, Enquiry, EnquiryStatus } from "@/lib/enquiries";
export const metadata = { title: "Staff inbox" };
async function Inbox() {
  const { client, user, clinicId } = await requireStaff();
  const [records, clinic] = await Promise.all([
    client.from("enquiries").select("id, reference, name, email, phone, category, contact_method, message, status, created_at, updated_at, enquiry_notes(id, text, created_at)").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
    client.from("clinics").select("name").eq("id", clinicId).single(),
  ]);
  if (records.error || clinic.error) throw new Error("The inbox could not be loaded.");
  const enquiries: Enquiry[] = (records.data ?? []).map(row => ({
    id: row.id, reference: row.reference, name: row.name, email: row.email, phone: row.phone,
    category: row.category as Category, contactMethod: row.contact_method as "email" | "phone",
    message: row.message, status: row.status as EnquiryStatus, createdAt: row.created_at, updatedAt: row.updated_at,
    notes: row.enquiry_notes.map(note => ({ id: note.id, text: note.text, createdAt: note.created_at })).sort((a,b) => a.createdAt.localeCompare(b.createdAt)),
  }));
  return <StaffInbox key={user.id} initialEnquiries={enquiries} clinicName={clinic.data.name} email={user.email ?? "Staff member"} />;
}
export default function StaffPage() {
  return <Suspense fallback={<p className="access-page" role="status">Checking staff access and loading enquiries…</p>}><Inbox /></Suspense>;
}

