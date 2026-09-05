import { afterEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  getMenuItems: vi.fn(),
  getCafeInfo: vi.fn(),
}));

vi.mock("@/lib/supabase/queries", () => queryMocks);

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("storefront data authority", () => {
  it("never replaces a configured Supabase failure with sample products", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://configured.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "configured-public-key");
    queryMocks.getMenuItems.mockRejectedValueOnce(new Error("dependency down"));
    const { fetchMenuItems } = await import("@/lib/data");

    await expect(fetchMenuItems()).rejects.toThrow("dependency down");
  });

  it("uses fixtures only for an explicit development or preview mode", async () => {
    const { resolveStorefrontDataSource } = await import("@/lib/data");

    expect(resolveStorefrontDataSource({ NODE_ENV: "development" })).toBe(
      "sample",
    );
    expect(
      resolveStorefrontDataSource({ PLAYWRIGHT_STOREFRONT_PREVIEW: "1" }),
    ).toBe("sample");
    expect(resolveStorefrontDataSource({ NODE_ENV: "production" })).toBe(
      "unavailable",
    );
    expect(
      resolveStorefrontDataSource({
        NODE_ENV: "development",
        NEXT_PUBLIC_SUPABASE_URL: "https://configured.example",
      }),
    ).toBe("supabase");
  });

  it("fails closed when production has no authoritative data source", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PLAYWRIGHT_STOREFRONT_PREVIEW", "0");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const { fetchCafeInfo, StorefrontDataUnavailableError } = await import(
      "@/lib/data"
    );

    await expect(fetchCafeInfo()).rejects.toBeInstanceOf(
      StorefrontDataUnavailableError,
    );
  });
});
