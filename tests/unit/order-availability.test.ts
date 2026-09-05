import { describe, expect, it } from "vitest";
import { canAcceptAsapOrder } from "@/lib/hours";

const hours = [
  { day: "Monday", open: "07:30", close: "15:00", closed: false },
];

describe("customer order availability", () => {
  it("closes ASAP ordering when the lead-time promise would reach closing", () => {
    expect(
      canAcceptAsapOrder(hours, 15, new Date("2026-08-17T18:44:00.000Z")),
    ).toBe(true);
    expect(
      canAcceptAsapOrder(hours, 15, new Date("2026-08-17T18:45:00.000Z")),
    ).toBe(false);
  });
});
