export const statuses = ["new", "in_progress", "resolved"] as const;
export type EnquiryStatus = (typeof statuses)[number];
export const statusLabels: Record<EnquiryStatus, string> = {
  new: "New", in_progress: "In progress", resolved: "Resolved",
};
export const categories = ["Appointment availability", "Clinic information", "Callback request", "Other administration"] as const;
export type Category = (typeof categories)[number];
export type EnquiryInput = {
  name: string; email: string; phone: string; category: Category;
  contactMethod: "email" | "phone"; message: string;
};
export type EnquiryNote = { id: string; text: string; createdAt: string };
export type Enquiry = EnquiryInput & {
  id: string; reference: string; status: EnquiryStatus; createdAt: string;
  updatedAt: string; notes: EnquiryNote[];
};
export type EnquiryErrors = Partial<Record<keyof EnquiryInput, string>>;
export type ValidationResult = { ok: true; value: EnquiryInput } | { ok: false; errors: EnquiryErrors };

export function validateEnquiry(values: Record<string, unknown>): ValidationResult {
  const text = (key: string) => typeof values[key] === "string" ? (values[key] as string).trim() : "";
  const name = text("name"), email = text("email"), phone = text("phone");
  const message = text("message"), category = text("category"), contactMethod = text("contactMethod");
  const errors: EnquiryErrors = {};
  if (name.length < 2 || name.length > 100) errors.name = "Enter a name between 2 and 100 characters.";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  if (phone && (!/^\+?[\d\s().-]{7,30}$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15)) errors.phone = "Enter a valid phone number, including country code where possible.";
  if (contactMethod !== "email" && contactMethod !== "phone") errors.contactMethod = "Choose how you would like to be contacted.";
  if (contactMethod === "phone" && !phone) errors.phone = "A phone number is required for a callback.";
  if (!(categories as readonly string[]).includes(category)) errors.category = "Choose an enquiry type.";
  if (message.length < 10 || message.length > 1500) errors.message = "Use between 10 and 1,500 characters.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, email, phone, message, category: category as Category, contactMethod: contactMethod as "email" | "phone" } };
}

export type EnquiryFilter = { query: string; status: EnquiryStatus | "all"; category: Category | "all"; from: string; to: string };
export const emptyFilter: EnquiryFilter = { query: "", status: "all", category: "all", from: "", to: "" };
export function filterEnquiries(enquiries: Enquiry[], filter: EnquiryFilter): Enquiry[] {
  const query = filter.query.trim().toLocaleLowerCase();
  return enquiries.filter((enquiry) => {
    const day = enquiry.createdAt.slice(0, 10);
    const searchable = `${enquiry.name} ${enquiry.email} ${enquiry.reference}`.toLocaleLowerCase();
    return (!query || searchable.includes(query)) && (filter.status === "all" || enquiry.status === filter.status)
      && (filter.category === "all" || enquiry.category === filter.category)
      && (!filter.from || day >= filter.from) && (!filter.to || day <= filter.to);
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}
export function enquiryCounts(enquiries: Enquiry[]) {
  return { total: enquiries.length, new: enquiries.filter((item) => item.status === "new").length,
    inProgress: enquiries.filter((item) => item.status === "in_progress").length,
    resolved: enquiries.filter((item) => item.status === "resolved").length };
}
export function changeEnquiryStatus(enquiries: Enquiry[], id: string, status: EnquiryStatus, now: string): Enquiry[] {
  if (!(statuses as readonly string[]).includes(status)) throw new Error("Unknown enquiry status.");
  return enquiries.map((item) => item.id === id ? { ...item, status, updatedAt: now } : item);
}
export function appendEnquiryNote(enquiries: Enquiry[], id: string, note: EnquiryNote): Enquiry[] {
  const text = note.text.trim();
  if (!text || text.length > 1000) throw new Error("Use between 1 and 1,000 characters for a note.");
  return enquiries.map((item) => item.id === id ? { ...item, updatedAt: note.createdAt, notes: [...item.notes, { ...note, text }] } : item);
}

