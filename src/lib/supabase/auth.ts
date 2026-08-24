import "server-only";

import { redirect } from "next/navigation";
import {
  AdminAuthorizationError,
  requireStaff,
} from "./admin.server";
import { createClient } from "./server";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAdminPage() {
  try {
    const { user } = await requireStaff();
    return user;
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      redirect(
        error.status === 401
          ? "/admin/login"
          : "/admin/login?error=access-denied"
      );
    }
    throw error;
  }
}

export const requireAuth = requireAdminPage;
