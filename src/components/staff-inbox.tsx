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
    <div className="detail-top"><span className="small-kicker">Enquiry details</span><span className={"status-badge " + enquiry.status}>{statusLabels[enquiry.status]}</span></div>
    <div className="detail-person"><span className="avatar large">{enquiry.name.split(/\s+/).slice(0,2).map(word => word[0]).join("").toUpperCase()}</span><div><h2 id="staff-detail-title" tabIndex={-1}>{enquiry.name}</h2><span>Received {date(enquiry.createdAt)} UTC</span></div></div>
    <details className="reference-disclosure"><summary>View full reference</summary><p className="reference">{enquiry.reference}</p></details>
    <div className="detail-field"><label htmlFor="staff-status">Workflow status</label><select id="staff-status" disabled={pending} value={enquiry.status} onChange={e => changeStatus(e.target.value as EnquiryStatus)}>{statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></div>
    <dl className="contact-details"><div><dt>Email</dt><dd>{enquiry.email}</dd></div><div><dt>Phone</dt><dd>{enquiry.phone || "Not provided"}</dd></div><div><dt>Preferred contact</dt><dd>{enquiry.contactMethod}</dd></div><div><dt>Enquiry type</dt><dd>{enquiry.category}</dd></div></dl>
    <section className="detail-message"><h3>Message</h3><p>{enquiry.message}</p></section>
    <section className="notes-section"><div className="section-line"><h3><Icon name="note" size={17}/>Internal notes</h3><span>{enquiry.notes.length}</span></div><p className="notes-help">Saved for staff follow-up. Nothing is sent to the enquirer.</p>
    {enquiry.notes.length ? <ol className="note-list">{enquiry.notes.map(note => <li key={note.id}><div><strong>Staff note</strong><time dateTime={note.createdAt}>{date(note.createdAt)} UTC</time></div><p>{note.text}</p></li>)}</ol> : <p className="no-notes">No notes yet.</p>}
    <form onSubmit={addNote}><label htmlFor="staff-note">Add an internal note</label><textarea id="staff-note" placeholder="Record the next step or a follow-up update…" value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={1000} disabled={pending} required /><div className="note-actions"><span>{text.length}/1,000</span><button className="button primary small" disabled={pending || !text.trim()}>{pending ? "Saving…" : "Add note"}</button></div></form></section>
    <p role="alert" className="field-error">{error}</p><p role="status" className="detail-feedback">{feedback}</p>
  </aside>;
}
export function StaffInbox({ initialEnquiries, clinicName, email }: { initialEnquiries: Enquiry[]; clinicName: string; email: string }) {
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [filter, setFilter] = useState<EnquiryFilter>(emptyFilter);
  const [selectedId, setSelectedId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filtered = filterEnquiries(enquiries, filter);
  const selected = filtered.find(entry => entry.id === selectedId) ?? filtered[0];
  const counts = enquiryCounts(enquiries);
  const metrics = [
    { status: "all", label: "All enquiries", value: counts.total, icon: "inbox" },
    { status: "new", label: "New", value: counts.new, icon: "mail" },
    { status: "in_progress", label: "In progress", value: counts.inProgress, icon: "clock" },
    { status: "resolved", label: "Resolved", value: counts.resolved, icon: "check" },
  ] as const;
  const filterCount = Number(filter.category !== "all") + Number(!!filter.from) + Number(!!filter.to);
  const hasFilters = !!filter.query || filter.status !== "all" || filterCount > 0;
  const invalidDates = !!filter.from && !!filter.to && filter.from > filter.to;
  function update(entry: Enquiry) { setEnquiries(current => current.map(item => item.id === entry.id ? entry : item)); }
  function selectStatus(status: EnquiryFilter["status"]) { setFilter(current => ({ ...current, status })); }
  function selectEnquiry(id: string) {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1000px)").matches) requestAnimationFrame(() => {
      const heading = document.getElementById("staff-detail-title");
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }
  return <div className="workspace">
    <a href="#staff-main" className="skip-link">Skip to inbox</a>
    <aside className="sidebar">
      <Link href="/" aria-label="Enquiry home"><Brand /></Link>
      <div className="clinic-switcher"><span className="clinic-icon">+</span><div><strong>{clinicName}</strong><span>Reception workspace</span></div></div>
      <p className="nav-label">Workspace</p>
      <nav aria-label="Enquiry status">{metrics.map(metric => <button key={metric.status} className={filter.status === metric.status ? "active" : ""} aria-pressed={filter.status === metric.status} onClick={() => selectStatus(metric.status)}><Icon name={metric.icon} size={18}/>{metric.label}<span>{metric.value}</span></button>)}</nav>
      <p className="nav-label">Explore</p><Link href="/demo" className="sidebar-link"><Icon name="external" size={17}/>Try the sample inbox</Link>
      <div className="sidebar-bottom"><div className="staff-profile"><span className="avatar staff"><Icon name="shield" size={17}/></span><div><strong>Staff account</strong><span>{email}</span></div></div><SignOutForm /></div>
    </aside>
    <div className="workspace-content">
      <header className="workspace-header"><span>{clinicName}<span className="breadcrumb-slash">/</span><strong>Enquiries</strong></span><Link href="/" className="quiet-link">Public form<Icon name="external" size={15}/></Link></header>
      <main id="staff-main" className="dashboard-main">
        <div className="dashboard-title"><div><span className="eyebrow">Staff workspace</span><h1>Enquiries</h1><p>Review requests, track follow-up, and keep the next step clear.</p></div><span className="workspace-badge"><Icon name="shield" size={15}/>Staff access</span></div>
        <div className="summary-grid">{metrics.map(metric => <button type="button" className={"summary-card " + (filter.status === metric.status ? "is-selected" : "")} aria-pressed={filter.status === metric.status} aria-label={"Show " + metric.label.toLowerCase() + ": " + metric.value} onClick={() => selectStatus(metric.status)} key={metric.status}><div><span>{metric.label}</span><Icon name={metric.icon} size={18}/></div><strong>{metric.value.toString().padStart(2,"0")}</strong></button>)}</div>
        <div className="inbox-workspace">
          <section className="inbox-panel" aria-labelledby="staff-inbox-title">
            <div className="inbox-heading"><div><h2 id="staff-inbox-title">Inbox<span>{filtered.length}</span></h2><p>{enquiries.length ? "Choose a request to review its details." : "New enquiries will appear here."}</p></div><span className="live-label"><span/>Saved enquiries</span></div>
            <div className="inbox-toolbar"><div className="search-box"><Icon name="search" size={18}/><label className="visually-hidden" htmlFor="staff-search">Search enquiries</label><input id="staff-search" type="search" value={filter.query} placeholder="Search name, email or reference" onChange={event => setFilter(current => ({...current,query:event.target.value}))}/></div><button type="button" className={"button secondary small " + (showFilters ? "pressed" : "")} aria-expanded={showFilters} aria-controls="staff-filters" onClick={() => setShowFilters(current => !current)}><Icon name="filter" size={16}/>Filters{filterCount > 0 && <span className="filter-count">{filterCount}</span>}</button></div>
            {showFilters && <div id="staff-filters" className="advanced-filters"><div className="filter-row"><label htmlFor="staff-category">Enquiry type</label><select id="staff-category" value={filter.category} onChange={event => setFilter(current => ({...current,category:event.target.value as EnquiryFilter["category"]}))}><option value="all">All types</option>{categories.map(category => <option key={category}>{category}</option>)}</select></div><div className="date-filters"><div><label htmlFor="staff-from">Received from (UTC)</label><input id="staff-from" type="date" value={filter.from} onChange={event => setFilter(current => ({...current,from:event.target.value}))}/></div><div><label htmlFor="staff-to">Received through (UTC)</label><input id="staff-to" type="date" value={filter.to} onChange={event => setFilter(current => ({...current,to:event.target.value}))}/></div></div>{invalidDates && <p role="alert" className="filter-error">The start date must be on or before the end date.</p>}</div>}
            {hasFilters && <div className="active-filters"><span>{filter.status === "all" ? "All statuses" : statusLabels[filter.status]}{filterCount ? " · " + filterCount + " extra filter" + (filterCount > 1 ? "s" : "") : ""}</span><button type="button" onClick={() => setFilter(emptyFilter)}>Clear all</button></div>}
            {filtered.length ? <div className="enquiry-list" role="list" aria-label="Enquiries">{filtered.map(entry => <div key={entry.id} role="listitem"><button className={"enquiry-row " + (entry.id === selected?.id ? "selected" : "")} aria-pressed={entry.id === selected?.id} onClick={() => selectEnquiry(entry.id)}><span className="avatar">{entry.name.split(/\s+/).slice(0,2).map(word => word[0]).join("").toUpperCase()}</span><span className="row-content"><span className="row-heading"><strong>{entry.name}</strong><time dateTime={entry.createdAt}>{date(entry.createdAt)} UTC</time></span><span className="row-category">{entry.category}</span><span className="row-preview">{entry.message}</span><span className="row-bottom"><span className={"status-badge " + entry.status}><span/>{statusLabels[entry.status]}</span><span className="row-reference">#{entry.reference.slice(0,8).toUpperCase()}</span></span></span><span className="row-arrow"><Icon name="chevron" size={16}/></span></button></div>)}</div> : <div className="empty-state"><Icon name="inbox" size={32}/><h3>{enquiries.length ? "No matching enquiries" : "Your inbox is ready"}</h3><p>{enquiries.length ? "Try a different search or clear your filters." : "Submit a fictional enquiry through the public form to get started."}</p>{hasFilters ? <button className="button secondary small" onClick={() => setFilter(emptyFilter)}>Clear filters</button> : <Link className="button secondary small" href="/">Open public form</Link>}</div>}
            <div className="inbox-footer"><span>{filtered.length} of {counts.total} enquiries</span><span>Dates shown in UTC</span></div>
          </section>
          {selected ? <Details key={selected.id} enquiry={selected} onChange={update}/> : <aside className="detail-panel detail-empty"><Icon name="note" size={30}/><h2>Enquiry details</h2><p>Select a request from the inbox to review it here.</p></aside>}
        </div>
        <p className="dashboard-footer"><span>Fictional administrative enquiries only.</span><span>No emails are sent.</span></p>
      </main>
    </div>
  </div>;
}
