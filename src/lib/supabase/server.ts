import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createBoundedSupabaseFetch } from "./bounded-fetch.server";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: createBoundedSupabaseFetch(),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from Server Component — safe to ignore.
            // Cookies are set in the proxy or Route Handler instead.
          }
        },
      },
    }
  );
}
