import { describe, expect, it } from "vitest";

import { assertSensitiveMaterialAbsent } from "../e2e/helpers/privacy-assertions";

describe("lifecycle privacy assertion diagnostics", () => {
  it("reports only a safe surface label when sensitive material is present", () => {
    const secret = "sensitive-tracking-bearer-material-should-never-print";
    const exposed = `https://example.invalid/order/status#${secret}`;
    let diagnostic = "";
    try {
      assertSensitiveMaterialAbsent(exposed, secret, "active URL");
    } catch (error) {
      diagnostic = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
    expect(diagnostic).toBe(
      "Error: active URL contained prohibited sensitive material.",
    );
    expect(diagnostic.includes(secret)).toBe(false);
    expect(diagnostic.includes(exposed)).toBe(false);
  });
});
