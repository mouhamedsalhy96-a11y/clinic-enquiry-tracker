"use client";
import Link from "next/link";
import { SignOutForm } from "@/components/sign-out-form";
export default function StaffError({ reset }: { reset: () => void }) {
  return <main className="access-page"><section className="access-card"><h1>Inbox unavailable</h1><p>We could not load or verify your staff workspace. Check your connection and try again.</p><button className="button primary" onClick={reset}>Try again</button><SignOutForm /><Link href="/login">Back to staff login</Link></section></main>;
}


