import { getRequestOrigin } from "@/lib/request-origin";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const expectedOrigin = getRequestOrigin(request);
  if (!expectedOrigin) {
    return new Response("Invalid request origin.", { status: 403 });
  }
  const target = new URL("/login", expectedOrigin);
  try {
    const client = await createClient({ writable: true });
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) target.searchParams.set("reason", "signout");
  } catch {
    target.searchParams.set("reason", "signout");
  }
  const response = NextResponse.redirect(target, 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}


