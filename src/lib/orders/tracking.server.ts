import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type { CanonicalCreateMaterial } from "./contracts";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function postgresBytea(hex: string): string {
  return `\\x${hex}`;
}

function postgresKeyOrder(left: string, right: string): number {
  const lengthDifference = Buffer.byteLength(left) - Buffer.byteLength(right);
  return lengthDifference || Buffer.from(left).compare(Buffer.from(right));
}

function postgresJsonbText(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical values must be finite.");
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(postgresJsonbText).join(", ")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => postgresKeyOrder(left, right),
    );
    return `{${entries
      .map(([key, child]) => `${JSON.stringify(key)}: ${postgresJsonbText(child)}`)
      .join(", ")}}`;
  }
  throw new TypeError("Unsupported canonical value.");
}

export function fingerprintCreateMaterial(
  material: CanonicalCreateMaterial,
): string {
  const normalized = {
    ...material,
    items: [...material.items].sort((left, right) =>
      postgresJsonbText(left).localeCompare(postgresJsonbText(right), "en"),
    ),
  };
  return sha256Hex(postgresJsonbText(normalized));
}

export function normalizeDatabaseBytea(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.startsWith("\\x") ? value.slice(2) : value;
  return /^[a-f0-9]{64}$/i.test(normalized) ? normalized.toLowerCase() : null;
}

export function constantTimeHexEqual(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}
