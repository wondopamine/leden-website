import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getCafeLocalDate,
  normalizeScheduledPickup,
} from "../../src/lib/orders/time.server";

describe("order time normalization", () => {
  it("uses the Montréal calendar day rather than the server UTC day", () => {
    expect(getCafeLocalDate(new Date("2026-08-25T02:30:00.000Z"))).toBe(
      "2026-08-24",
    );
  });

  it("normalizes an exact same-day local wall time", () => {
    expect(
      normalizeScheduledPickup(
        "2026-08-24T14:30",
        new Date("2026-08-24T16:00:00.000Z"),
      ),
    ).toBe("2026-08-24T14:30:00");
  });

  it.each([
    "2026-08-25T14:30",
    "2026-08-24T14:30:01",
    "2026-08-24T24:00",
    "2026-08-24 14:30",
    "not-a-date",
  ])("rejects non-contract wall time %s", (value) => {
    expect(() =>
      normalizeScheduledPickup(value, new Date("2026-08-24T16:00:00.000Z")),
    ).toThrow(expect.objectContaining({ code: "PICKUP_INVALID" }));
  });
});
