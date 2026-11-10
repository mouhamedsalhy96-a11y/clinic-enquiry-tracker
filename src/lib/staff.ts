import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function requireStaff() {
  await connection();
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: membership, error: accessError } = await client.from("staff_members").select("clinic_id, active").eq("user_id", user.id).maybeSingle();
  if (accessError) throw new Error("Unable to verify staff access. Please retry.");
  if (!membership?.active) redirect("/login?reason=access");
  return { client, user, clinicId: membership.clinic_id as string };
}
