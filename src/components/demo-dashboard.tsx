"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useDemoEnquiries } from "./demo-provider";
import { Brand, Icon } from "./ui";
import { categories, emptyFilter, enquiryCounts, filterEnquiries, statusLabels, statuses, type Enquiry, type EnquiryFilter, type EnquiryStatus } from "@/lib/enquiries";

function formatDate(date: string, includeTime = false) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "UTC" }).format(new Date(date));
}
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase(); }
function StatusBadge({ status }: { status: EnquiryStatus }) { return <span className={`status-badge ${status}`}><span />{statusLabels[status]}</span>; }

function EnquiryDetails({ enquiry }: { enquiry: Enquiry }) {
  const { updateStatus, addNote } = useDemoEnquiries();
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [noteError, setNoteError] = useState("");
  const noteInput = useRef<HTMLTextAreaElement>(null);

  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = note.trim();
    if (!text || text.length > 1000) { setNoteError("Write a note between 1 and 1,000 characters."); return; }
    addNote(enquiry.id, text); setNote(""); setNoteError(""); setFeedback("Internal note added to this demo enquiry.");
    noteInput.current?.focus();
  }
  return <aside className="detail-panel" aria-labelledby="detail-title">
    <div className="detail-top"><span className="small-kicker">ENQUIRY DETAILS</span><span className="reference">{enquiry.reference}</span></div>
    <div className="detail-person"><span className="avatar large">{initials(enquiry.name)}</span><div><h2 id="detail-title">{enquiry.name}</h2><span>Received {formatDate(enquiry.createdAt, true)} UTC</span></div></div>
    <div className="detail-field"><label htmlFor="detail-status">Workflow status</label><select id="detail-status" value={enquiry.status} onChange={(event) => { updateStatus(enquiry.id, event.target.value as EnquiryStatus); setFeedback(`Status updated to ${statusLabels[event.target.value as EnquiryStatus]}.`); }}>{statuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></div>
    <dl className="contact-details"><div><dt><Icon name="mail" size={15} />Email</dt><dd>{enquiry.email}</dd></div><div><dt><Icon name="phone" size={15} />Phone</dt><dd>{enquiry.phone || "Not provided"}</dd></div><div><dt>Preferred contact</dt><dd className="capitalize">{enquiry.contactMethod}</dd></div><div><dt>Enquiry type</dt><dd>{enquiry.category}</dd></div></dl>
    <section className="detail-message"><h3>Message</h3><p>{enquiry.message}</p></section>
    <section className="notes-section"><div className="section-line"><h3><Icon name="note" size={16} />Internal notes</h3><span>{enquiry.notes.length}</span></div><p className="notes-help">For staff follow-up. Notes are not sent to the enquirer.</p>
      {enquiry.notes.length ? <ol className="note-list">{enquiry.notes.map((item) => <li key={item.id}><div><strong>Demo staff</strong><time dateTime={item.createdAt}>{formatDate(item.createdAt, true)} UTC</time></div><p>{item.text}</p></li>)}</ol> : <p className="no-notes">No notes yet. Add context for the next follow-up.</p>}
      <form onSubmit={saveNote}><label className="visually-hidden" htmlFor="internal-note">Add an internal note</label><textarea ref={noteInput} id="internal-note" rows={3} maxLength={1000} value={note} onChange={(event) => { setNote(event.target.value); setNoteError(""); }} placeholder="Add a follow-up note…" aria-invalid={!!noteError} aria-describedby={noteError ? "note-error" : undefined} />{noteError && <p id="note-error" className="field-error">{noteError}</p>}<div className="note-actions"><span>{note.length}/1,000</span><button className="button secondary small" type="submit"><Icon name="plus" size={14} />Add note</button></div></form>
    </section><p className="detail-feedback" role="status" aria-live="polite">{feedback}</p>
  </aside>;
}

export function DemoDashboard() {
  const { enquiries, resetDemo } = useDemoEnquiries();
  const [filter, setFilter] = useState<EnquiryFilter>(emptyFilter);
  const [selectedId, setSelectedId] = useState<string>("demo-1");
  const [showDates, setShowDates] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const counts = enquiryCounts(enquiries);
  const filtered = filterEnquiries(enquiries, filter);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];
  const hasFilters = filter.query || filter.status !== "all" || filter.category !== "all" || filter.from || filter.to;
  const invalidRange = !!filter.from && !!filter.to && filter.from > filter.to;
  function setStatus(status: EnquiryStatus | "all") { setFilter((current) => ({ ...current, status })); }

  return <div className="workspace">
    <a href="#main" className="skip-link">Skip to inbox</a>
    <aside className="sidebar"><Link href="/demo/enquire" aria-label="Enquiry home"><Brand /></Link><div className="clinic-switcher"><span className="clinic-icon">+</span><div><strong>Demo clinic</strong><span>Reception workspace</span></div><span className="demo-tag">DEMO</span></div>
      <p className="nav-label">WORKSPACE</p><nav aria-label="Enquiry inbox"><button className={filter.status === "all" ? "active" : ""} onClick={() => setStatus("all")}><Icon name="inbox" size={18} />All enquiries <span>{counts.total}</span></button><button className={filter.status === "new" ? "active" : ""} onClick={() => setStatus("new")}><span className="nav-status-dot new" />New <span>{counts.new}</span></button><button className={filter.status === "in_progress" ? "active" : ""} onClick={() => setStatus("in_progress")}><span className="nav-status-dot progress" />In progress <span>{counts.inProgress}</span></button><button className={filter.status === "resolved" ? "active" : ""} onClick={() => setStatus("resolved")}><span className="nav-status-dot resolved" />Resolved <span>{counts.resolved}</span></button></nav>
      <p className="nav-label">EXPLORE</p><Link href="/demo/enquire" className="sidebar-link"><Icon name="external" size={17} />Public enquiry form</Link><Link href="/login" className="sidebar-link"><Icon name="shield" size={17} />Staff access</Link>
      <div className="sidebar-bottom"><div className="demo-explainer"><strong>A workspace to try.</strong><p>Submit a fictional enquiry, change its status, and add a note. Refresh to start again.</p><button onClick={() => { if (window.confirm("Reset the demo? Your demo enquiries and notes will be cleared.")) { resetDemo(); setFilter(emptyFilter); setSelectedId("demo-1"); setAnnouncement("The demo has been reset."); } }}><Icon name="reset" size={14} />Reset demo</button></div><div className="staff-profile"><span className="avatar staff">DS</span><div><strong>Demo staff</strong><span>Open preview · no sign-in</span></div></div></div>
    </aside>
    <div className="workspace-content"><header className="workspace-header"><span>Workspace <span className="breadcrumb-slash">/</span> <strong>Enquiries</strong></span><Link className="quiet-link" href="/demo/enquire">View public form <Icon name="external" size={15} /></Link></header>
      <main id="main" className="dashboard-main"><div className="dashboard-title"><div><span className="eyebrow">A CALMER FRONT DESK</span><h1>Sample inbox</h1><p>Explore the workflow with fictional enquiries. Refresh to reset the sample.</p></div><Link className="button primary" href="/demo/enquire"><Icon name="plus" size={17} />Try the enquiry form</Link></div>
        <div className="summary-grid">{[{ label: "Total enquiries", value: counts.total, caption: "All demo requests", icon: "inbox", status: "all" }, { label: "Awaiting review", value: counts.new, caption: "Ready for a first look", icon: "mail", status: "new" }, { label: "In progress", value: counts.inProgress, caption: "Follow-up underway", icon: "clock", status: "in_progress" }, { label: "Resolved", value: counts.resolved, caption: "Marked as complete", icon: "check", status: "resolved" }].map((metric) => <button className={`summary-card ${metric.status === filter.status ? "is-selected" : ""}`} key={metric.label} onClick={() => setStatus(metric.status as EnquiryStatus | "all")} aria-label={`Filter ${metric.label}: ${metric.value}`}><div><span>{metric.label}</span><Icon name={metric.icon} size={18} /></div><strong>{metric.value.toString().padStart(2, "0")}</strong><small>{metric.caption}</small></button>)}</div>
        <div className="inbox-workspace"><section className="inbox-panel" aria-labelledby="inbox-title"><div className="inbox-heading"><div><h2 id="inbox-title">Enquiry inbox <span>{filtered.length}</span></h2><p>Review, organise, and keep the next step clear.</p></div><span className="live-label"><span />Demo session</span></div>
          <div className="inbox-toolbar"><div className="search-box"><Icon name="search" size={17} /><label htmlFor="search-enquiries" className="visually-hidden">Search by name, email or reference</label><input id="search-enquiries" type="search" placeholder="Search name, email or reference…" value={filter.query} onChange={(event) => setFilter((current) => ({ ...current, query: event.target.value }))} /></div><button className={`button secondary small ${showDates ? "pressed" : ""}`} aria-expanded={showDates} aria-controls="date-filters" onClick={() => setShowDates((current) => !current)}><Icon name="clock" size={15} />Dates<Icon name="chevron" size={12} /></button></div>
          <div className="filter-row"><div className="status-tabs" role="group" aria-label="Filter by status">{["all", ...statuses].map((status) => <button key={status} aria-pressed={filter.status === status} onClick={() => setStatus(status as EnquiryStatus | "all")} className={filter.status === status ? "selected" : ""}>{status === "all" ? "All" : statusLabels[status as EnquiryStatus]}</button>)}</div><label className="visually-hidden" htmlFor="category-filter">Filter by enquiry type</label><select id="category-filter" value={filter.category} onChange={(event) => setFilter((current) => ({ ...current, category: event.target.value as EnquiryFilter["category"] }))}><option value="all">All types</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></div>
          {showDates && <div className="date-filters" id="date-filters"><div><label htmlFor="date-from">Received from (UTC)</label><input id="date-from" type="date" value={filter.from} onChange={(event) => setFilter((current) => ({ ...current, from: event.target.value }))} /></div><div><label htmlFor="date-to">Received through (UTC)</label><input id="date-to" type="date" value={filter.to} onChange={(event) => setFilter((current) => ({ ...current, to: event.target.value }))} /></div></div>}
          {invalidRange && <p className="filter-error" role="alert">The start date must be on or before the end date.</p>}
          {filtered.length ? <div className="enquiry-list" role="list" aria-label="Filtered enquiries">{filtered.map((enquiry) => <div role="listitem" key={enquiry.id}><button className={`enquiry-row ${selected?.id === enquiry.id ? "selected" : ""}`} onClick={() => setSelectedId(enquiry.id)} aria-pressed={selected?.id === enquiry.id}><span className="avatar">{initials(enquiry.name)}</span><span className="row-content"><span className="row-heading"><strong>{enquiry.name}</strong><time dateTime={enquiry.createdAt}>{formatDate(enquiry.createdAt)}</time></span><span className="row-category">{enquiry.category}</span><span className="row-preview">{enquiry.message}</span><span className="row-bottom"><StatusBadge status={enquiry.status} /><span className="row-reference">{enquiry.reference}</span></span></span><span className="row-arrow"><Icon name="arrow" size={16} /></span></button></div>)}</div> : <div className="empty-state"><Icon name="search" size={30} /><h3>No matching enquiries</h3><p>Try a different search or clear the filters.</p><button className="button secondary small" onClick={() => setFilter(emptyFilter)}>Clear filters</button></div>}
          <div className="inbox-footer"><span>{filtered.length} of {counts.total} enquiries</span>{hasFilters ? <button onClick={() => setFilter(emptyFilter)}>Clear filters</button> : <span>Received dates shown in UTC</span>}</div>
        </section>{selected ? <EnquiryDetails key={selected.id} enquiry={selected} /> : <aside className="detail-panel detail-empty"><Icon name="inbox" size={32} /><p>Select an enquiry to see the details.</p></aside>}</div>
        <p className="dashboard-footer">Built for an organised front desk.<span>Fictional data · No messages are sent</span></p><p className="visually-hidden" role="status" aria-live="polite">{announcement}</p>
      </main>
    </div>
  </div>;
}
