// Domain data types for the storefront + admin. Previously defined in the Sanity
// layer; now vendor-neutral. Data is sourced from Supabase (with a sample-data
// fallback) via src/lib/data.ts — these types are the shared contract.

export type LocalizedString = {
  en: string;
  fr: string;
};

export type ModifierOption = {
  name: LocalizedString;
  priceAdjustment: number;
};

export type Modifier = {
  name: LocalizedString;
  options: ModifierOption[];
};

export type MenuItem = {
  _id: string;
  name: LocalizedString;
  description: LocalizedString;
  price: number;
  category: {
    _id: string;
    name: LocalizedString;
    slug: string;
  };
  /** Absolute image URL, or undefined to fall back to a category image. */
  imageUrl?: string;
  available: boolean;
  status: "available" | "sold_out" | "hidden";
  modifiers: Modifier[];
};

export type Category = {
  _id: string;
  name: LocalizedString;
  slug: string;
  order: number;
};

export type CafeInfo = {
  hours: {
    day: string;
    open: string;
    close: string;
    closed: boolean;
  }[];
  address: string;
  phone: string;
  announcement?: LocalizedString;
  pickupLeadTime: number;
  maxAdvanceOrderDays: number;
};
