import { createHash, createHmac } from "node:crypto";

const RUN_ID_PATTERN = /^[0-9]{8}T[0-9]{6}Z-[a-z0-9]{8,32}$/;

function assertRunId(runId) {
  if (typeof runId !== "string" || !RUN_ID_PATTERN.test(runId)) {
    throw new Error("Lifecycle identity requires an exact run ID.");
  }
}

export function deriveLifecycleClientIp(runId) {
  assertRunId(runId);
  const digest = createHash("sha256")
    .update(`lifecycle-client\0${runId}`, "utf8")
    .digest("hex");
  const groups = Array.from({ length: 6 }, (_, index) =>
    digest.slice(index * 4, index * 4 + 4),
  );
  return `2001:db8:${groups.join(":")}`;
}

export function deriveLifecycleRateKeyHex(runId, version, key) {
  assertRunId(runId);
  if (!/^v[1-9][0-9]*$/.test(version) || typeof key !== "string" || key.length < 32) {
    throw new Error("Lifecycle rate identity configuration is invalid.");
  }
  return createHmac("sha256", key)
    .update(`${version}\0${deriveLifecycleClientIp(runId)}`, "utf8")
    .digest("hex");
}
