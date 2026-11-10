"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { TurnstileChallenge } from "./turnstile-challenge";
import { Brand, Icon } from "./ui";
import { useDemoEnquiries } from "./demo-provider";
import { categories, validateEnquiry, type EnquiryErrors, type EnquiryInput } from "@/lib/enquiries";

const initialValues: EnquiryInput = { name: "", email: "", phone: "", category: "Appointment availability", contactMethod: "email", message: "" };

export function PublicEnquiryForm({ demo = false }: { demo?: boolean }) {
  const { addEnquiry } = useDemoEnquiries();
  const [values, setValues] = useState<EnquiryInput>(initialValues);
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [created, setCreated] = useState<{ reference: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [challengeVersion, setChallengeVersion] = useState(0);
  const requestId = useRef<string | null>(null);
  const website = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const successHeading = useRef<HTMLHeadingElement>(null);

  function update(key: keyof EnquiryInput, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setSaveError("");
    const result = validateEnquiry(values);
    setConsentError(consent ? "" : "Please confirm you are using fictional details.");
    if (!result.ok) {
      setErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      document.getElementById(`enquiry-${first}`)?.focus();
      return;
    }
    if (!consent) return;
    if (demo) {
      setCreated(addEnquiry(result.value));
    } else {
      if (!turnstileToken) { setSaveError("Complete the security check before submitting."); return; }
      requestId.current ??= crypto.randomUUID();
      submitting.current = true;
      setPending(true);
      try {
        const response = await fetch("/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...result.value, consent, turnstileToken, requestId: requestId.current, website: website.current?.value ?? "" }) });
        const data = await response.json();
        if (!response.ok || typeof data.reference !== "string") {
          setSaveError(data.error ?? "Unable to save. Keep your details here and retry.");
          if (data.errors) setErrors(data.errors);
          return;
        }
        setCreated({ reference: data.reference });
      } catch { setSaveError("We could not confirm the save. Keep this form open and retry with the same details."); return; }
      finally { submitting.current = false; setPending(false); setTurnstileToken(""); setChallengeVersion(current => current + 1); }
    }
    setTimeout(() => successHeading.current?.focus(), 0);
  }
  function error(key: keyof EnquiryInput) {
    return errors[key] ? <p className="field-error" id={`enquiry-${key}-error`}>{errors[key]}</p> : null;
  }

  return (
    <div className="public-page">
      <header className="public-header"><Link href="/" aria-label="Enquiry home"><Brand /></Link><Link href="/demo" className="quiet-link">Explore staff demo <Icon name="arrow" size={16} /></Link></header>
      <main id="main" className="public-grid">
        <section className="public-intro">
          <span className="eyebrow">A LITTLE LESS ADMIN. A LITTLE MORE CARE.</span>
          <h1>A clearer way<br />to get in touch<span>.</span></h1>
          <p className="intro-copy">Ask about appointments, clinic information, or an administrative request. Keep everything in one place, from the first hello to the final follow-up.</p>
          <div className="intro-feature"><span className="feature-icon"><Icon name="note" /></span><div><strong>Tell the reception team</strong><p>Share the practical details of your enquiry.</p></div></div>
          <div className="intro-feature"><span className="feature-icon"><Icon name="clock" /></span><div><strong>A clear path to follow-up</strong><p>The staff workspace keeps each request organised.</p></div></div>
          <aside className="scope-note"><Icon name="shield" /><p><strong>An administrative enquiry, only.</strong><br />Do not include symptoms, medical history, or other health information. This demonstration does not provide care or handle urgent requests.</p></aside>
          <p className="fictional-label">FICTIONAL CLINIC · INTERACTIVE PORTFOLIO DEMO</p>
        </section>
        <section className="form-card" aria-labelledby="form-title">
          {created ? <div className="success-panel"><span className="success-icon"><Icon name="check" size={32} /></span><span className="eyebrow">{demo ? "ADDED TO THE DEMO INBOX" : "SAVED TO THE CLINIC INBOX"}</span><h2 ref={successHeading} tabIndex={-1}>{demo ? "Your demo enquiry is ready." : "Your enquiry has been saved."}</h2><p>Reference <strong>{created.reference}</strong></p><p>{demo ? "This sample lives in this tab only. Refreshing clears it." : "Saved to the protected staff inbox in Supabase. Keep your reference. No email has been sent; this fictional clinic does not provide care."}</p><Link className="button primary" href={demo ? "/demo" : "/login"}>{demo ? "View the demo inbox" : "Staff sign-in"}<Icon name="arrow" size={17}/></Link><button className="button secondary" onClick={() => { setCreated(null); setValues(initialValues); setConsent(false); requestId.current = null; setSaveError(""); }}>Try another enquiry</button></div> : <>
            <div className="form-heading"><span className="small-kicker">LET’S START HERE</span><h2 id="form-title">Make an enquiry</h2><p>{demo ? "Use fictional details to explore the in-memory demo." : "Use fictional details. Submissions are saved in the development database."}</p></div>
            <form onSubmit={submit} noValidate><fieldset className="submission-fields" disabled={pending}><div className="honeypot" aria-hidden="true"><label htmlFor="website">Leave this empty</label><input ref={website} id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
              <div className="field"><label htmlFor="enquiry-name">Full name <span>*</span></label><input id="enquiry-name" name="name" autoComplete="off" required maxLength={100} value={values.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Jordan Taylor" aria-invalid={!!errors.name} aria-describedby={errors.name ? "enquiry-name-error" : undefined} />{error("name")}</div>
              <div className="field-pair"><div className="field"><label htmlFor="enquiry-email">Email address <span>*</span></label><input id="enquiry-email" name="email" type="email" autoComplete="off" required maxLength={254} value={values.email} onChange={(event) => update("email", event.target.value)} placeholder="jordan@example.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? "enquiry-email-error" : undefined} />{error("email")}</div><div className="field"><label htmlFor="enquiry-phone">Phone <small>optional</small></label><input id="enquiry-phone" name="phone" type="tel" autoComplete="off" maxLength={30} value={values.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Fictional number only" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "enquiry-phone-error" : undefined} />{error("phone")}</div></div>
              <div className="field"><label htmlFor="enquiry-category">What can the team help with? <span>*</span></label><select id="enquiry-category" name="category" value={values.category} onChange={(event) => update("category", event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select>{error("category")}</div>
              <fieldset className="contact-options"><legend>Preferred way to respond <span>*</span></legend><label className={values.contactMethod === "email" ? "selected" : ""}><input type="radio" name="contactMethod" value="email" checked={values.contactMethod === "email"} onChange={() => update("contactMethod", "email")} /><Icon name="mail" size={17} />Email</label><label className={values.contactMethod === "phone" ? "selected" : ""}><input type="radio" name="contactMethod" value="phone" checked={values.contactMethod === "phone"} onChange={() => update("contactMethod", "phone")} /><Icon name="phone" size={17} />Phone</label></fieldset>
              <div className="field"><label htmlFor="enquiry-message">Your message <span>*</span></label><textarea id="enquiry-message" name="message" rows={4} minLength={10} maxLength={1500} required value={values.message} onChange={(event) => update("message", event.target.value)} placeholder="For example, I’d like to ask about morning appointment availability next week." aria-invalid={!!errors.message} aria-describedby={`message-help${errors.message ? " enquiry-message-error" : ""}`} /><div className="field-help"><span id="message-help">Administrative details only.</span><span>{values.message.length}/1,500</span></div>{error("message")}</div>
              <label className="consent"><input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setConsentError(""); }} aria-describedby={consentError ? "consent-error" : undefined} />I understand this is a demo and I am using fictional details.</label>{consentError && <p className="field-error" id="consent-error" role="alert">{consentError}</p>}
              {!demo && <TurnstileChallenge key={challengeVersion} onToken={setTurnstileToken} onRetry={() => { setTurnstileToken(""); setChallengeVersion(current => current + 1); }} />}
              <button disabled={pending || (!demo && !turnstileToken)} type="submit" className="button primary full-width">{pending ? "Saving…" : demo ? "Create demo enquiry" : "Save enquiry"} <Icon name="arrow" size={17} /></button><p className="form-footnote"><Icon name="shield" size={13} />{demo ? "Stored in this tab’s memory only. No email is sent." : "Saved to the staff inbox. No email is sent."}</p>
              {saveError && <p className="field-error" role="alert">{saveError}</p>}</fieldset>
            </form>
          </>}
        </section>
      </main>
      <footer className="public-footer"><span>enquiry. <span className="footer-divider">/</span> Thoughtful tools for the front desk.</span><Link href="/login">Staff access <Icon name="external" size={13} /></Link></footer>
    </div>
  );
}
