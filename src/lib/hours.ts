// Live open/closed status for the café, computed in the café's local timezone
// (America/Toronto) so it is correct regardless of where the visitor is.

export type DayHours = { day: string; open: string; close: string; closed?: boolean };

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const CAFE_TZ = "America/Toronto";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Current weekday index (0=Sun) and minutes-since-midnight in the café timezone. */
function cafeNow(now: Date): { dayIndex: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CAFE_TZ,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Monday";
  let hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  if (hour === 24) hour = 0; // some environments emit 24 at midnight
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { dayIndex: WEEKDAYS.indexOf(weekday), minutes: hour * 60 + minute };
}

export type OpenStatus =
  | { isOpen: true; closeAt: string }
  | { isOpen: false; nextDay: string; nextOpen: string; isToday: boolean };

/**
 * Returns whether the café is open right now and, if not, when it next opens.
 * `hours` is the weekly schedule; `now` defaults to the current time.
 */
export function getOpenStatus(hours: DayHours[], now: Date = new Date()): OpenStatus {
  const byDay = new Map(hours.map((h) => [h.day, h]));
  const { dayIndex, minutes } = cafeNow(now);

  const today = byDay.get(WEEKDAYS[dayIndex]);
  if (today && !today.closed) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    if (minutes >= open && minutes < close) {
      return { isOpen: true, closeAt: today.close };
    }
    // Before opening today → opens later today.
    if (minutes < open) {
      return { isOpen: false, nextDay: WEEKDAYS[dayIndex], nextOpen: today.open, isToday: true };
    }
  }

  // Scan the next 7 days for the next open day.
  for (let i = 1; i <= 7; i++) {
    const d = byDay.get(WEEKDAYS[(dayIndex + i) % 7]);
    if (d && !d.closed) {
      return {
        isOpen: false,
        nextDay: WEEKDAYS[(dayIndex + i) % 7],
        nextOpen: d.open,
        isToday: false,
      };
    }
  }
  // Fallback: no open days found.
  return { isOpen: false, nextDay: WEEKDAYS[dayIndex], nextOpen: "07:30", isToday: false };
}

/** Current long weekday name in the café timezone (e.g. "Monday"). */
export function getCafeWeekday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: CAFE_TZ, weekday: "long" }).format(now);
}

/** Minutes since midnight in the café timezone — the shared clock for open-status and slots. */
export function getCafeMinutes(now: Date = new Date()): number {
  return cafeNow(now).minutes;
}

/** Whether an ASAP promise can still land before today's close. */
export function canAcceptAsapOrder(
  hours: DayHours[],
  pickupLeadTime: number,
  now: Date = new Date(),
): boolean {
  const status = getOpenStatus(hours, now);
  if (!status.isOpen || status.closeAt === "24:00") return status.isOpen;
  return getCafeMinutes(now) + pickupLeadTime < toMinutes(status.closeAt);
}

type Translator = (key: string, values?: Record<string, string | number>) => string;

/**
 * Builds the localized open/closed pill label from a status. Single source of
 * truth for the status copy (used by hero, visit, footer, order).
 * `tc` is a next-intl translator scoped to the "common" namespace.
 */
export function formatStatusLabel(status: OpenStatus, tc: Translator, locale: string): string {
  if (status.isOpen) return tc("status.openUntil", { time: formatTime(status.closeAt, locale) });
  if (status.isToday) return tc("status.opensToday", { time: formatTime(status.nextOpen, locale) });
  return tc("status.opensDay", {
    day: tc(`daysShort.${status.nextDay}`),
    time: formatTime(status.nextOpen, locale),
  });
}

/** "15:00" → "3pm" (en) / "15 h" (fr). */
export function formatTime(hhmm: string, locale: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (locale === "fr") return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${period}` : `${h12}${period}`;
}
