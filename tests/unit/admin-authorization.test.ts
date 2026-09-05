import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AdminAuthorizationError,
  authorizeStaffWithClient,
} from "../../src/lib/supabase/admin.server";

const USER = { id: "d6000000-0000-4000-8000-000000000001" };

function fakeClient({
  user = USER,
  userError = null,
  membership = true,
  membershipError = null,
}: {
  user?: typeof USER | null;
  userError?: { message: string } | null;
  membership?: boolean | null;
  membershipError?: { message: string } | null;
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: userError,
      }),
    },
    rpc: vi.fn().mockResolvedValue({
      data: membership,
      error: membershipError,
    }),
  };
}

describe("authorizeStaffWithClient", () => {
  it.each([
    ["missing session", { user: null }],
    ["invalid session", { user: null, userError: { message: "raw auth failure" } }],
  ])("returns a safe 401-class error for %s", async (_name, input) => {
    await expect(authorizeStaffWithClient(fakeClient(input))).rejects.toMatchObject({
      code: "ADMIN_UNAUTHENTICATED",
      status: 401,
      message: "Admin authentication required.",
    });
  });

  it.each([
    ["unlisted user", { membership: false }],
    [
      "membership lookup failure",
      { membership: null, membershipError: { message: "raw database failure" } },
    ],
  ])("returns a safe 403-class error for %s", async (_name, input) => {
    await expect(authorizeStaffWithClient(fakeClient(input))).rejects.toMatchObject({
      code: "ADMIN_FORBIDDEN",
      status: 403,
      message: "Admin access denied.",
    });
  });

  it("returns the verified user and same cookie-aware client for staff", async () => {
    const client = fakeClient();
    await expect(authorizeStaffWithClient(client)).resolves.toEqual({
      user: USER,
      supabase: client,
    });
    expect(client.rpc).toHaveBeenCalledWith("is_admin");
  });

  it("rechecks live membership on every action after revocation", async () => {
    const client = fakeClient();
    client.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });

    await expect(authorizeStaffWithClient(client)).resolves.toMatchObject({
      user: USER,
    });
    await expect(authorizeStaffWithClient(client)).rejects.toBeInstanceOf(
      AdminAuthorizationError
    );
    expect(client.auth.getUser).toHaveBeenCalledTimes(2);
    expect(client.rpc).toHaveBeenCalledTimes(2);
  });
});
