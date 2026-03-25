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
  image?: {
    asset: {
      _ref: string;
    };
  };
  available: boolean;
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
