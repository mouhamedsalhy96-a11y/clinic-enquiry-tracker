import "server-only";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { validateEnquiry } from "@/lib/enquiries";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function submitPublicEnquiry(input: Record<string, unknown>) {
  const validation = validateEnquiry(input);
  if (!validation.ok) return { status: 422, body: { error: "Please check the highlighted fields.", errors: validation.errors } };
  if (input.consent !== true) return { status: 422, body: { error: "Confirm you are using fictional details." } };
  if (typeof input.requestId !== "string" || !uuid.test(input.requestId)) return { status: 422, body: { error: "Invalid submission reference. Reload the form." } };
  if (input.website) return { status: 422, body: { error: "Unable to submit this form." } };
  const secret = process.env.SUPABASE_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!secret || !url) return { status: 503, body: { error: "Database submissions are not configured yet. Please try again after setup." } };
  const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const digest = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
  try {
    const { data, error } = await client.rpc("submit_public_enquiry", {
      p_request_id: input.requestId,
      p_email_hash: digest(validation.value.email.toLowerCase()),
      p_payload_hash: digest(JSON.stringify(validation.value)),
      p_input: validation.value,
    });
    if (error?.message === "submission_limit") return { status: 429, body: { error: "The submission limit has been reached. Try again in 15 minutes." } };
    if (error?.message === "request_conflict") return { status: 409, body: { error: "This submission reference was already used. Reload before sending a different enquiry." } };
    if (error || typeof data !== "string" || !uuid.test(data)) return { status: 503, body: { error: "We could not confirm your save. Keep the form open and retry with the same details." } };
    return { status: 201, body: { reference: data } };
  } catch {
    return { status: 503, body: { error: "We could not confirm your save. Keep the form open and retry with the same details." } };
  }
}

