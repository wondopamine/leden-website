import { describe, expect, it } from "vitest";

import { parseAdminIntegerInput } from "../../src/lib/admin-settings";

describe("parseAdminIntegerInput", () => {
  it("preserves an explicit zero for the same-day ordering contract", () => {
    expect(parseAdminIntegerInput("0", 3)).toBe(0);
  });

  it("uses the field-specific fallback only for an empty or invalid value", () => {
    expect(parseAdminIntegerInput("", 0)).toBe(0);
    expect(parseAdminIntegerInput("not-a-number", 15)).toBe(15);
  });
});
