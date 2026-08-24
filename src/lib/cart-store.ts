import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItemModifier = {
  /** Missing only on a pre-hardening persisted cart. */
  modifierId?: string;
  /** Missing only on a pre-hardening persisted cart. */
  optionId?: string;
  name: string;
  option: string;
  priceAdjustment: number;
};

export type CartItem = {
  id: string;
  menuItemId: string;
  name: string;
  nameEn: string;
  nameFr: string;
  price: number;
  quantity: number;
  modifiers: CartItemModifier[];
  image?: string;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTax: () => { gst: number; qst: number; total: number };
  getTotal: () => number;
};

const GST_RATE = 0.05;
const QST_RATE = 0.09975;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const id = `${item.menuItemId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((state) => ({
          items: [...state.items, { ...item, id }],
        }));
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          const modifierTotal = item.modifiers.reduce(
            (m, mod) => m + mod.priceAdjustment,
            0
          );
          return sum + (item.price + modifierTotal) * item.quantity;
        }, 0);
      },

      getTax: () => {
        const subtotal = get().getSubtotal();
        const gst = subtotal * GST_RATE;
        const qst = subtotal * QST_RATE;
        return { gst, qst, total: gst + qst };
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const { total: tax } = get().getTax();
        return subtotal + tax;
      },
    }),
    {
      name: "cafe-leden-cart",
      version: 1,
      partialize: (state) => ({ items: state.items }),
      migrate: (persistedState) => migratePersistedCart(persistedState),
    }
  )
);

export function migratePersistedCart(
  persistedState: unknown,
): Pick<CartState, "items"> {
  if (
    typeof persistedState !== "object" ||
    persistedState === null ||
    !("items" in persistedState) ||
    !Array.isArray((persistedState as { items?: unknown }).items)
  ) {
    return { items: [] };
  }
  return {
    items: (persistedState as { items: CartItem[] }).items,
  };
}
