import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/ui";
import { LoginForm } from "@/components/login-form";
import { SignOutForm } from "@/components/sign-out-form";
async function SignIn({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const messages: Record<string, string> = {
    credentials: "Unable to sign in. Check your details and try again.",
    invalid: "Enter a valid email and password.",
    unavailable: "The sign-in service is unavailable. Please try again.",
    access: "This account has no active clinic membership. Contact the administrator.",
    signout: "Sign-out could not be completed. Your session may still be active. Please try again.",
  };
  return <><LoginForm error={messages[reason ?? ""] ?? ""}/>{(reason === "access" || reason === "signout") && <SignOutForm />}</>;
}
export default function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  return <main className="access-page"><section className="access-card"><Brand /><span className="small-kicker">STAFF ACCESS</span><h1>Welcome back.</h1><p>Sign in with your administrator-assigned staff account.</p><Suspense fallback={<p role="status">Loading sign-in form…</p>}><SignIn searchParams={searchParams}/></Suspense><Link href="/demo" className="quiet-link">Explore the fictional demo</Link><Link href="/" className="quiet-link">Back to the enquiry form</Link></section></main>;
}

