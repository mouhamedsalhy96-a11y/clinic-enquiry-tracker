import { createClient } from "@/lib/supabase/server";
export async function login(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || email.length > 254 || !password || password.length > 1024) return { error: "Enter your email and password.", reason: "invalid" };
  try {
    const client = await createClient({ writable: true });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: "Unable to sign in. Check your details and try again.", reason: "credentials" };
    const { data: staff, error: accessError } = await client.from("staff_members").select("active").eq("user_id", data.user.id).maybeSingle();
    if (accessError || !staff?.active) {
      await client.auth.signOut({ scope: "local" });
      return { error: "Staff access is unavailable for this account. Contact the administrator.", reason: "access" };
    }
  } catch { return { error: "The sign-in service is unavailable. Please try again.", reason: "unavailable" }; }
  return { error: "", reason: "" };
}

