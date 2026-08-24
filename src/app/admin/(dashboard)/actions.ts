"use server";

import { revalidatePath } from "next/cache";
import {
  transitionAdminOrder,
  updateOnlineOrdering,
  type AdminTransitionInput,
} from "@/lib/orders/admin.server";
import type { AdminOrderStatus } from "@/lib/orders/admin-realtime";

export type OrderStatus = AdminOrderStatus;

export async function updateOrderStatus(input: AdminTransitionInput) {
  const result = await transitionAdminOrder(input);
  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${input.orderId}`);
  }
  return result;
}

export async function setOnlineOrderingEnabled(enabled: boolean) {
  const result = await updateOnlineOrdering(enabled);
  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/");
    revalidatePath("/en/order");
    revalidatePath("/fr/order");
  }
  return result;
}
