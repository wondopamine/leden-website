export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
}

export function getLocalizedString(
  obj: { en: string; fr: string },
  locale: string
): string {
  return locale === "fr" ? obj.fr : obj.en;
}
