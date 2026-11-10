"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
type Turnstile = {
  render: (container: HTMLElement, options: {
    sitekey: string; action: string; theme: string; size: string;
    callback: (token: string) => void; "expired-callback": () => void;
    "error-callback": () => void; "timeout-callback": () => void;
  }) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }
export function TurnstileChallenge({ onToken, onRetry }: { onToken: (token: string) => void; onRetry: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Loading security check…");
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!ready || !sitekey || !container.current || !window.turnstile) return;
    const api = window.turnstile;
    const id = api.render(container.current, {
      sitekey, action: "clinic_enquiry", theme: "light", size: "flexible",
      callback: token => { onToken(token); setMessage("Security check complete."); },
      "expired-callback": () => { onToken(""); setMessage("Security check expired. Retry the check."); },
      "error-callback": () => { onToken(""); setMessage("Security check could not load. Retry, or check your connection."); },
      "timeout-callback": () => { onToken(""); setMessage("Security check timed out. Retry the check."); },
    });
    return () => { api.remove(id); };
  }, [ready, sitekey, onToken]);
  if (!sitekey) return <p role="alert" className="field-error">Security verification is not configured yet.</p>;
  return <div className="security-check">
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setReady(true)} onError={() => { onToken(""); setMessage("Security check could not load. Retry or check your connection."); }}/>
    <div ref={container}/><p role="status">{message}</p><button type="button" className="quiet-link" onClick={onRetry}>Retry security check</button>
  </div>;
}

