import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createClient({ writable = false }: { writable?: boolean } = {}) {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => jar.getAll(), setAll(values) {
      if (writable) {
        for (const c of values) jar.set(c.name, c.value, c.options);
      } else {
        // Read-only Server Components rely on the proxy to refresh cookies.
        try { for (const c of values) jar.set(c.name, c.value, c.options); } catch { /* read-only render */ }
      }
    } },
  });
}

