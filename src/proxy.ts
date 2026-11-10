import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => request.cookies.getAll(), setAll(values, headers) {
      for (const c of values) request.cookies.set(c.name, c.value);
      response = NextResponse.next({ request });
      for (const c of values) response.cookies.set(c.name, c.value, c.options);
      for (const [name, value] of Object.entries(headers ?? {})) response.headers.set(name, value);
    } },
  });
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/staff/:path*", "/login"] };
