import { describe, expect, it, vi } from "vitest";

import { runExactLifecycleCleanup } from "../../scripts/verify-order-lifecycle-local.mjs";

describe("local lifecycle cleanup orchestration", () => {
  it("runs exact manifest cleanup when the foreign control cannot be created", async () => {
    const controlFailure = new Error("control setup failed");
    const runManifestCleanup = vi.fn().mockResolvedValue(undefined);
    const verifyAndRemoveForeignControl = vi.fn();

    await expect(
      runExactLifecycleCleanup({
        createForeignControl: vi.fn().mockRejectedValue(controlFailure),
        runManifestCleanup,
        verifyAndRemoveForeignControl,
      }),
    ).rejects.toBe(controlFailure);

    expect(runManifestCleanup).toHaveBeenCalledOnce();
    expect(verifyAndRemoveForeignControl).not.toHaveBeenCalled();
  });

  it("aggregates independent control, manifest cleanup, and removal failures", async () => {
    const control = { id: "foreign-control" };
    const cleanupFailure = new Error("manifest cleanup failed");
    const removalFailure = new Error("control removal failed");

    let thrown;
    try {
      await runExactLifecycleCleanup({
        createForeignControl: vi.fn().mockResolvedValue(control),
        runManifestCleanup: vi.fn().mockRejectedValue(cleanupFailure),
        verifyAndRemoveForeignControl: vi.fn().mockRejectedValue(removalFailure),
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AggregateError);
    expect(thrown.errors).toEqual([cleanupFailure, removalFailure]);
  });
});
