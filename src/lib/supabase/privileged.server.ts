import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { OrderBoundaryError } from "../orders/errors";

export function createPrivilegedClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new OrderBoundaryError("ORDERING_UNAVAILABLE", 503);
  }
  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
