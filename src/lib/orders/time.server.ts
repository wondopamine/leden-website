import "server-only";

import { OrderBoundaryError } from "./errors";

const CAFE_TIME_ZONE = "America/Toronto";
const WALL_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;

export function getCafeLocalDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAFE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function normalizeScheduledPickup(value: string, now: Date): string {
  const match = WALL_TIME_PATTERN.exec(value);
  if (!match) throw new OrderBoundaryError("PICKUP_INVALID", 400);
  const [, year, month, day, hour, minute] = match;
  const candidate = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );
  if (
    candidate.getUTCFullYear() !== Number(year) ||
    candidate.getUTCMonth() !== Number(month) - 1 ||
    candidate.getUTCDate() !== Number(day) ||
    `${year}-${month}-${day}` !== getCafeLocalDate(now)
  ) {
    throw new OrderBoundaryError("PICKUP_INVALID", 400);
  }
  return `${year}-${month}-${day}T${hour}:${minute}:00`;
}

export function normalizePickupForDatabase(
  pickup:
    | { mode: "asap"; scheduledLocal: null }
    | { mode: "scheduled"; scheduledLocal: string },
  now: Date = new Date(),
) {
  return pickup.mode === "asap"
    ? pickup
    : {
        mode: pickup.mode,
        scheduledLocal: normalizeScheduledPickup(pickup.scheduledLocal, now),
      };
}
