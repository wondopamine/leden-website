import { beforeEach, describe, expect, it } from "vitest";
import {
  migratePersistedCart,
  useCartStore,
  type CartItem,
} from "@/lib/cart-store";
import {
  checkoutAttemptOwnsCart,
  ensureCheckoutAttempt,
  getCheckoutRecoveryAttempt,
  requireCheckoutRecovery,
  type CheckoutMaterial,
  type StorageLike,
} from "@/lib/orders/checkout-attempt";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const item: CartItem = {
  id: "submitted-line",
  menuItemId: "11111111-1111-4111-8111-111111111111",
  name: "Latte",
  nameEn: "Latte",
  nameFr: "Latté",
  price: 5,
  quantity: 1,
  modifiers: [],
};

const materialItems: CheckoutMaterial["items"] = [
  { menuItemId: item.menuItemId, quantity: 1, optionIds: [] },
];

describe("checkout cart ownership", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [item], revision: 0, cartGeneration: 0 });
  });

  it("does not clear a cart changed after submission started", () => {
    const submittedRevision = useCartStore.getState().revision;
    useCartStore.getState().addItem({
      ...item,
      id: undefined,
      menuItemId: "22222222-2222-4222-8222-222222222222",
      name: "Croissant",
      nameEn: "Croissant",
      nameFr: "Croissant",
    } as Omit<CartItem, "id">);

    expect(
      useCartStore.getState().clearCartIfRevision(submittedRevision),
    ).toBe(false);
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("lets persisted recovery clear only the cart owned by that attempt", async () => {
    const storage = new MemoryStorage();
    const attempt = await ensureCheckoutAttempt(
      {
        customer: { name: "Test", phone: "5145550199" },
        locale: "en",
        pickup: { mode: "asap" },
        items: materialItems,
      },
      storage,
      0,
    );
    requireCheckoutRecovery(attempt.attemptId, false, storage);
    const pending = getCheckoutRecoveryAttempt(storage);

    expect(pending).not.toBeNull();
    await expect(
      checkoutAttemptOwnsCart(pending!, materialItems, 0),
    ).resolves.toBe(true);
    await expect(
      checkoutAttemptOwnsCart(pending!, [
        ...materialItems,
        {
          menuItemId: "22222222-2222-4222-8222-222222222222",
          quantity: 1,
          optionIds: [],
        },
      ], 0),
    ).resolves.toBe(false);
  });

  it("does not own a removed and recreated cart with identical contents", async () => {
    const storage = new MemoryStorage();
    const attempt = await ensureCheckoutAttempt(
      {
        customer: { name: "Test", phone: "5145550199" },
        locale: "en",
        pickup: { mode: "asap" },
        items: materialItems,
      },
      storage,
      useCartStore.getState().cartGeneration,
    );
    requireCheckoutRecovery(attempt.attemptId, false, storage);
    const pending = getCheckoutRecoveryAttempt(storage)!;

    useCartStore.getState().removeItem(item.id);
    useCartStore.getState().addItem({
      menuItemId: item.menuItemId,
      name: item.name,
      nameEn: item.nameEn,
      nameFr: item.nameFr,
      price: item.price,
      quantity: item.quantity,
      modifiers: item.modifiers,
    });
    const rebuilt = useCartStore.getState();

    expect(rebuilt.cartGeneration).toBe(2);
    await expect(
      checkoutAttemptOwnsCart(
        pending,
        [{ menuItemId: item.menuItemId, quantity: 1, optionIds: [] }],
        rebuilt.cartGeneration,
      ),
    ).resolves.toBe(false);
  });

  it("preserves a valid cart generation and resets legacy values safely", () => {
    expect(migratePersistedCart({ items: [item], cartGeneration: 7 })).toEqual({
      items: [item],
      cartGeneration: 7,
    });
    expect(migratePersistedCart({ items: [item] })).toEqual({
      items: [item],
      cartGeneration: 0,
    });
  });
});
