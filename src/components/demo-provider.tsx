"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { demoEnquiries } from "@/lib/demo-data";
import { appendEnquiryNote, changeEnquiryStatus, type Enquiry, type EnquiryInput, type EnquiryStatus } from "@/lib/enquiries";

type Store = {
  enquiries: Enquiry[];
  addEnquiry: (input: EnquiryInput) => Enquiry;
  updateStatus: (id: string, status: EnquiryStatus) => void;
  addNote: (id: string, text: string) => void;
  resetDemo: () => void;
};
const DemoContext = createContext<Store | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(demoEnquiries);
  function addEnquiry(input: EnquiryInput): Enquiry {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const entry: Enquiry = { ...input, id, reference: `ENQ-${id.slice(0, 8).toUpperCase()}`, status: "new", createdAt: now, updatedAt: now, notes: [] };
    setEnquiries((current) => [entry, ...current]);
    return entry;
  }
  function updateStatus(id: string, status: EnquiryStatus) {
    const now = new Date().toISOString();
    setEnquiries((current) => changeEnquiryStatus(current, id, status, now));
  }
  function addNote(id: string, text: string) {
    const note = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() };
    setEnquiries((current) => appendEnquiryNote(current, id, note));
  }
  return <DemoContext.Provider value={{ enquiries, addEnquiry, updateStatus, addNote, resetDemo: () => setEnquiries(demoEnquiries) }}>{children}</DemoContext.Provider>;
}
export function useDemoEnquiries() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("Use the enquiry store inside DemoProvider.");
  return context;
}
