import { describe, expect, it } from "vitest";

import { redactLifecycleDiagnostics } from "../../scripts/lifecycle-output-safety.mjs";

describe("lifecycle reporter diagnostics", () => {
  it("redacts bearer, UUID, contact, credential, and fragment material", () => {
    const bearer = "abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE";
    const attempt = "d7000000-0000-4000-8000-000000000001";
    const email = "lifecycle-fixture@example.invalid";
    const password = "random-fixture-password-material-Aa1!";
    const raw = [
      `trackingSecret: '${bearer}'`,
      `attemptId: '${attempt}'`,
      `customer_phone: '5145550199'`,
      `password: '${password}'`,
      `user ${email}`,
      `https://localhost/order/status#${bearer}`,
      "Client synthétique FR",
    ].join("\n");
    const safe = redactLifecycleDiagnostics(raw);
    for (const prohibited of [
      bearer,
      attempt,
      email,
      password,
      "5145550199",
      "Client synthétique FR",
    ]) {
      expect(safe.includes(prohibited)).toBe(false);
    }
    expect(safe).toContain("<redacted>");
  });
});
