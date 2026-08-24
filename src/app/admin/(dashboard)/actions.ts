"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/supabase/admin.server";

export type OrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "picked_up"
  | "cancelled";

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
) {
  const { supabase } = await requireStaff();

  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) throw new Error("Unable to update order status.");

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
}
