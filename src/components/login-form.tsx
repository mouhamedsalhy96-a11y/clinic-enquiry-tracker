"use client";
import { useState } from "react";
export function LoginForm({ error = "" }: { error?: string }) {
  const [pending, setPending] = useState(false);
  return <form action="/auth/login" method="post" className="staff-login-form" onSubmit={() => setPending(true)}>
    <label htmlFor="staff-email">Email address</label><input id="staff-email" name="email" type="email" autoComplete="username" required maxLength={254} />
    <label htmlFor="staff-password">Password</label><input id="staff-password" name="password" type="password" autoComplete="current-password" required maxLength={1024} />
    <p role="alert" className="field-error">{error}</p>
    <button className="button primary" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
  </form>;
}

