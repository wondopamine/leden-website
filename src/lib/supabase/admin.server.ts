import "server-only";

import { createClient } from "./server";

export type AdminAuthorizationErrorCode =
  | "ADMIN_UNAUTHENTICATED"
  | "ADMIN_FORBIDDEN";

export class AdminAuthorizationError extends Error {
  readonly code: AdminAuthorizationErrorCode;
  readonly status: 401 | 403;

  constructor(code: AdminAuthorizationErrorCode, status: 401 | 403) {
    super(
      code === "ADMIN_UNAUTHENTICATED"
        ? "Admin authentication required."
        : "Admin access denied."
    );
    this.name = "AdminAuthorizationError";
    this.code = code;
    this.status = status;
  }
}

type VerifiedUser = { id: string };

export type StaffAuthorizationClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: VerifiedUser | null };
      error: { message: string } | null;
    }>;
  };
  rpc: (
    functionName: "is_admin"
  ) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

export async function authorizeStaffWithClient<
  Client extends StaffAuthorizationClient,
>(supabase: Client) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AdminAuthorizationError("ADMIN_UNAUTHENTICATED", 401);
  }

  const { data: isAdmin, error: membershipError } = await supabase.rpc(
    "is_admin"
  );
  if (membershipError || isAdmin !== true) {
    throw new AdminAuthorizationError("ADMIN_FORBIDDEN", 403);
  }

  return { user, supabase };
}

export async function requireStaff() {
  const supabase = await createClient();
  return authorizeStaffWithClient(supabase);
}
