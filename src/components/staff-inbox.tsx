"use client";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { SignOutForm } from "./sign-out-form";
import { saveNote, saveStatus } from "@/lib/staff-requests";
import { Brand, Icon } from "./ui";
import { categories, emptyFilter, enquiryCounts, filterEnquiries, statuses, statusLabels, type Enquiry, type EnquiryFilter, type EnquiryStatus } from "@/lib/enquiries";

function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(value));
}
function Details({ enquiry, onChange }: { enquiry: Enquiry; onChange: (entry: Enquiry) => void }) {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  function changeStatus(status: EnquiryStatus) {
    start(async () => {
      setError(""); setFeedback("");
      try {
        const result = await saveStatus(enquiry.id, status);
        if (result.error) { setError(result.error); return; }
        if (result.status && result.updatedAt) onChange({ ...enquiry, status: result.status, updatedAt: result.updatedAt });
        setFeedback("Status saved.");
      } catch { setError("Unable to save. Check your connection or sign in again."); }
    });
  }
  function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || text.trim().length > 1000) { setError("Write a note between 1 and 1,000 characters."); return; }
    start(async () => {
      setError(""); setFeedback("");
      try {
        const result = await saveNote(enquiry.id, text);
        if (result.error) { setError(result.error); return; }
        if (!result.note) { setError("The server did not confirm the saved note. Refresh before retrying."); return; }
        onChange({ ...enquiry, notes: [...enquiry.notes, result.note] });
        setText(""); setFeedback("Internal note saved.");
      } catch { setError("Unable to save. Your note draft is still here. Check your connection or sign in again."); }
    });
  }
  return <aside className="detail-panel" aria-labelledby="staff-detail-title">
    <div className="detail-top"><span className="small-kicker">ENQUIRY DETAILS</span></div><p className="reference">{enquiry.reference}</p>
    <h2 id="staff-detail-title">{enquiry.name}</h2><p>Received {date(enquiry.createdAt)} UTC</p>
    <div className="detail-field"><label htmlFor="staff-status">Workflow status</label><select id="staff-status" disabled={pending} value={enquiry.status} onChange={e => changeStatus(e.target.value as EnquiryStatus)}>{statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></div>
    <dl className="contact-details"><div><dt>Email</dt><dd>{enquiry.email}</dd></div><div><dt>Phone</dt><dd>{enquiry.phone || "Not provided"}</dd></div><div><dt>Preferred contact</dt><dd>{enquiry.contactMethod}</dd></div><div><dt>Enquiry type</dt><dd>{enquiry.category}</dd></div></dl>
    <section className="detail-message"><h3>Message</h3><p>{enquiry.message}</p></section>
    <section className="notes-section"><h3>Internal notes</h3><p className="notes-help">Saved for staff follow-up. Nothing is sent to the enquirer.</p>
    {enquiry.notes.length ? <ol className="note-list">{enquiry.notes.map(note => <li key={note.id}><div><strong>Staff note</strong><time dateTime={note.createdAt}>{date(note.createdAt)} UTC</time></div><p>{note.text}</p></li>)}</ol> : <p className="no-notes">No notes yet.</p>}
    <form onSubmit={addNote}><label htmlFor="staff-note">Add an internal note</label><textarea id="staff-note" value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={1000} disabled={pending} required /><div className="note-actions"><span>{text.length}/1,000</span><button className="button secondary small" disabled={pending}>{pending ? "Saving…" : "Add note"}</button></div></form></section>
    <p role="alert" className="field-error">{error}</p><p role="status" className="detail-feedback">{feedback}</p>
  </aside>;
}
export function StaffInbox({ initialEnquiries, clinicName, email }: { initialEnquiries: Enquiry[]; clinicName: string; email: string }) {
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [filter, setFilter] = useState<EnquiryFilter>(emptyFilter);
  const [selectedId, setSelectedId] = useState("");
  const filtered = filterEnquiries(enquiries, filter);
  const selected = filtered.find(entry => entry.id === selectedId) ?? filtered[0];
  const counts = enquiryCounts(enquiries);
  function update(entry: Enquiry) { setEnquiries(current => current.map(item => item.id === entry.id ? entry : item)); }
  const invalidDates = filter.from && filter.to && filter.from > filter.to;
  return <div className="workspace"><a href="#staff-main" className="skip-link">Skip to inbox</a>
    <aside className="sidebar"><Link href="/" aria-label="Enquiry home"><Brand /></Link><div className="clinic-switcher"><span className="clinic-icon">+</span><div><strong>{clinicName}</strong><span>Protected staff workspace</span></div></div><p className="nav-label">WORKSPACE</p><nav aria-label="Enquiry status">{["all", ...statuses].map(status => <button key={status} className={filter.status === status ? "active" : ""} onClick={() => setFilter(current => ({ ...current, status: status as EnquiryFilter["status"] }))}>{status === "all" ? "All enquiries" : statusLabels[status as EnquiryStatus]}</button>)}</nav><Link href="/demo" className="sidebar-link">Open fictional demo</Link><div className="sidebar-bottom"><div className="staff-profile"><div><strong>Signed in</strong><span>{email}</span></div></div><SignOutForm /></div></aside>
    <div className="workspace-content"><header className="workspace-header"><span>Staff workspace / Enquiries</span><Link href="/" className="quiet-link">Public enquiry form</Link></header>
    <main id="staff-main" className="dashboard-main"><div className="dashboard-title"><div><span className="eyebrow">YOUR CLINIC INBOX</span><h1>Every enquiry. One clear view.</h1><p>Database records persist after refresh. Use fictional administrative details only.</p></div></div>
    <div className="summary-grid">{[{label:"Total enquiries",value:counts.total},{label:"New",value:counts.new},{label:"In progress",value:counts.inProgress},{label:"Resolved",value:counts.resolved}].map(metric => <div className="summary-card" key={metric.label}><div>{metric.label}</div><strong>{metric.value}</strong></div>)}</div>
    <div className="inbox-workspace"><section className="inbox-panel" aria-labelledby="staff-inbox-title"><div className="inbox-heading"><div><h2 id="staff-inbox-title">Enquiry inbox</h2><p>{enquiries.length ? "Select an enquiry to review and follow up." : "No saved enquiries yet. Submit a fictional enquiry through the public form."}</p></div></div>
    <div className="inbox-toolbar"><div className="search-box"><Icon name="search" size={17}/><label className="visually-hidden" htmlFor="staff-search">Search enquiries</label><input id="staff-search" type="search" value={filter.query} placeholder="Search name, email or reference…" onChange={e => setFilter(current => ({...current,query:e.target.value}))}/></div></div>
    <div className="filter-row"><label htmlFor="staff-category">Enquiry type</label><select id="staff-category" value={filter.category} onChange={e => setFilter(current => ({...current,category:e.target.value as EnquiryFilter["category"]}))}><option value="all">All types</option>{categories.map(category => <option key={category}>{category}</option>)}</select></div>
    <div className="date-filters"><div><label htmlFor="staff-from">Received from (UTC)</label><input id="staff-from" type="date" value={filter.from} onChange={e => setFilter(current => ({...current,from:e.target.value}))}/></div><div><label htmlFor="staff-to">Received through (UTC)</label><input id="staff-to" type="date" value={filter.to} onChange={e => setFilter(current => ({...current,to:e.target.value}))}/></div></div>
    {invalidDates && <p role="alert" className="field-error">The start date must be on or before the end date.</p>}
    {filtered.length ? <div className="enquiry-list">{filtered.map(entry => <button className={"enquiry-row " + (entry.id === selected?.id ? "selected" : "")} key={entry.id} aria-pressed={entry.id === selected?.id} onClick={() => setSelectedId(entry.id)}><span className="row-content"><span className="row-heading"><strong>{entry.name}</strong><time>{date(entry.createdAt)} UTC</time></span><span className="row-category">{entry.category}</span><span className="row-preview">{entry.message}</span><span className="row-bottom"><span className={"status-badge " + entry.status}>{statusLabels[entry.status]}</span></span></span></button>)}</div> : <div className="empty-state"><h3>{enquiries.length ? "No matching enquiries" : "Your inbox is ready"}</h3><p>{enquiries.length ? "Try another search or clear the filters." : "New submissions appear after you refresh this inbox."}</p></div>}
    <div className="inbox-footer"><span>{filtered.length} of {counts.total} enquiries</span><button onClick={() => setFilter(emptyFilter)}>Clear filters</button></div></section>
    {selected ? <Details key={selected.id} enquiry={selected} onChange={update}/> : <aside className="detail-panel detail-empty"><Icon name="inbox" size={32}/><p>Select an enquiry to see its details.</p></aside>}</div>
    </main></div></div>;
}



