"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
}
