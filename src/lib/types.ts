// Domain data types for the storefront + admin. Previously defined in the Sanity
// layer; now vendor-neutral. Data is sourced from Supabase (with a sample-data
// fallback) via src/lib/data.ts — these types are the shared contract.

export type LocalizedString = {
  en: string;
  fr: string;
};

export type ModifierOption = {
  _id: string;
  name: LocalizedString;
  priceAdjustment: number;
};

export type Modifier = {
  _id: string;
  name: LocalizedString;
  minSelections: 0 | 1;
  maxSelections: 1;
  options: ModifierOption[];
};

export type PublicOrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "picked_up"
  | "cancelled";

export type PublicReceiptModifier = {
  modifier_name: string;
  option_name: string;
  price_adjustment: number;
};

export type PublicReceiptItem = {
  name: string;
  base_price: number;
  modifier_total: number;
  unit_price: number;
  quantity: number;
  line_total: number;
  modifiers: PublicReceiptModifier[];
};

export type PublicOrderReceipt = {
  receipt_id: string;
  order_number: string;
  status: PublicOrderStatus;
  status_version: number;
  promised_pickup_at: string;
  subtotal: number;
  tax_gst: number;
  tax_qst: number;
  total: number;
  gst_rate: number;
  qst_rate: number;
  created_at: string;
  items: PublicReceiptItem[];
};

export type PublicOrderProjection = {
  order_number: string;
  status: PublicOrderStatus;
  status_version: number;
  promised_pickup_at: string;
  updated_at: string;
  cafe: { address: string | null; phone: string | null };
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
