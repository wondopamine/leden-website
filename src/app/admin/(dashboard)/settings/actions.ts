"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("cafe_info")
    .update({
      hours: input.hours,
      address: input.address,
      phone: input.phone,
      announcement_en: input.announcement_en || null,
      announcement_fr: input.announcement_fr || null,
      pickup_lead_time: input.pickup_lead_time,
      max_advance_order_days: input.max_advance_order_days,
    })
    .eq("id", input.id);

  if (error) throw new Error(error.message);

  updateTag("cafe-info");
  revalidatePath("/admin/settings");
  revalidatePath("/");
}
