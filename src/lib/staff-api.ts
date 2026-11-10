import "server-only";
import { createClient } from "@/lib/supabase/server";

export class StaffApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function requireStaff() {
  const client = await createClient({ writable: true });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new StaffApiError(401, "Your session has expired. Sign in again before saving.");
  const { data, error: accessError } = await client.from("staff_members").select("clinic_id, active").eq("user_id", user.id).maybeSingle();
  if (accessError) throw new StaffApiError(503, "Unable to verify staff access. Please retry.");
  if (!data?.active) throw new StaffApiError(403, "Your account has no active clinic access.");
  return { client, user, clinicId: data.clinic_id as string };
}

