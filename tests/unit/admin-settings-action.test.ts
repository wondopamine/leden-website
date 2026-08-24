import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireStaff: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/admin.server", () => ({
  requireStaff: mocks.requireStaff,
}));

import { updateCafeInfo } from "../../src/app/admin/(dashboard)/settings/actions";

const SETTINGS = {
  id: "d5000000-0000-4000-8000-000000000001",
  hours: [
    { day: "Monday", open: "07:30", close: "15:00", closed: false },
  ],
  address: "Synthetic address",
  phone: "5145550100",
  announcement_en: "",
  announcement_fr: "",
  pickup_lead_time: 15,
  max_advance_order_days: 0,
};

function staffDatabase() {
  const builder = {
    update: vi.fn(() => builder),
    eq: vi.fn().mockResolvedValue({ error: null }),
  };
  const from = vi.fn(() => builder);
  mocks.requireStaff.mockResolvedValue({ supabase: { from } });
  return { builder, from };
}

describe("same-day café settings action", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists the fixed zero-day contract during a normal admin save", async () => {
    const { builder } = staffDatabase();

    await expect(updateCafeInfo(SETTINGS)).resolves.toBeUndefined();

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ max_advance_order_days: 0 }),
    );
  });

  it("rejects a forged future-day value before updating café configuration", async () => {
    const { builder } = staffDatabase();

    await expect(
      updateCafeInfo({ ...SETTINGS, max_advance_order_days: 1 }),
    ).rejects.toThrow("Unable to update café settings.");
    expect(builder.update).not.toHaveBeenCalled();
  });
});
