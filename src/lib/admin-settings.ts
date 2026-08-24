export const SAME_DAY_MAX_ADVANCE_ORDER_DAYS = 0;

export function parseAdminIntegerInput(value: string, fallback: number): number {
  if (value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}
