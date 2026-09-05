export type SensitiveSurface =
  | "active URL"
  | "request URL"
  | "request referrer"
  | "local storage"
  | "session storage"
  | "history state"
  | "browser request origin";

export function assertSensitiveMaterialAbsent(
  haystack: string,
  needle: string,
  surface: SensitiveSurface,
) {
  if (haystack.includes(needle)) {
    throw new Error(`${surface} contained prohibited sensitive material.`);
  }
}
