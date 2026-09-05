"use server";

import { revalidatePath } from "next/cache";
import { SAME_DAY_MAX_ADVANCE_ORDER_DAYS } from "@/lib/admin-settings";
import { requireStaff } from "@/lib/supabase/admin.server";

type HourEntry = {
  day: string;
  open: string;
  close: string;
  closed: boolean;
};

type CafeInfoUpdate = {
  id: string;
  hours: HourEntry[];
  address: string;
  phone: string;
  announcement_en: string;
  announcement_fr: string;
  pickup_lead_time: number;
  max_advance_order_days: number;
};

export async function updateCafeInfo(input: CafeInfoUpdate) {
  const { supabase } = await requireStaff();

  if (input.max_advance_order_days !== SAME_DAY_MAX_ADVANCE_ORDER_DAYS) {
    throw new Error("Unable to update café settings.");
  }

  const { error } = await supabase
    .from("cafe_info")
    .update({
      hours: input.hours,
      address: input.address,
      phone: input.phone,
      announcement_en: input.announcement_en || null,
      announcement_fr: input.announcement_fr || null,
      pickup_lead_time: input.pickup_lead_time,
      max_advance_order_days: SAME_DAY_MAX_ADVANCE_ORDER_DAYS,
    })
    .eq("id", input.id);

  if (error) throw new Error("Unable to update café settings.");

  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/en/order");
  revalidatePath("/fr/order");
}
