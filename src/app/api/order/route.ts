import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
  modifiers: { name: string; option: string; priceAdjustment: number }[];
  menuItemId?: string;
};

type OrderBody = {
  items: OrderItem[];
  customerInfo: { name: string; phone: string };
  pickupTime: string | null;
  locale: string;
  total: number;
};

const GST_RATE = 0.05;
const QST_RATE = 0.09975;

function getSupabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function validateBusinessHours(supabase: any, pickupTime: string | null) {
  const { data: cafeInfo } = await supabase
    .from("cafe_info")
    .select("hours, pickup_lead_time")
    .limit(1)
    .single();

  if (!cafeInfo) return null; // Can't validate without cafe info, allow order

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info = cafeInfo as any;
  const hours = info.hours as { day: string; open: string; close: string; closed: boolean }[];
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const today = hours.find((h) => h.day === dayName);

  if (!today || today.closed) {
    return "The cafe is closed today. Please try again during business hours.";
  }

  const now = new Date();
  const [openH, openM] = today.open.split(":").map(Number);
  const [closeH, closeM] = today.close.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  if (nowMin < openMin || nowMin >= closeMin) {
    return `The cafe is currently closed. Hours today: ${today.open} - ${today.close}.`;
  }

  // Validate pickup time is within hours
  if (pickupTime && !pickupTime.includes("T")) {
    const [pH, pM] = pickupTime.split(":").map(Number);
    const pickupMin = pH * 60 + pM;
    if (pickupMin < openMin || pickupMin >= closeMin) {
      return `Pickup time must be between ${today.open} and ${today.close}.`;
    }
  }

  return null; // Valid
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function validateItems(supabase: any, items: OrderItem[]) {
  const itemIds = items.map((i) => i.menuItemId).filter(Boolean);
  if (itemIds.length === 0) return null; // No IDs to validate (legacy orders)

  const { data: dbItems } = await supabase
    .from("menu_items")
    .select("id, price, status, name_en")
    .in("id", itemIds);

  if (!dbItems) return null;

  type DbItem = { id: string; price: number; status: string; name_en: string };
  const dbMap = new Map<string, DbItem>(dbItems.map((i: DbItem) => [i.id, i]));

  for (const item of items) {
    if (!item.menuItemId) continue;
    const dbItem: DbItem | undefined = dbMap.get(item.menuItemId);

    if (!dbItem) {
      return `Item "${item.name}" is no longer on our menu.`;
    }
    if (dbItem.status !== "available") {
      return `"${dbItem.name_en}" is currently ${dbItem.status === "sold_out" ? "sold out" : "unavailable"}.`;
    }
    // Allow small floating point differences (< 1 cent)
    if (Math.abs(Number(dbItem.price) - item.price) > 0.01) {
      return `Price for "${dbItem.name_en}" has changed. Please refresh the menu and try again.`;
    }
  }
  return null;
}

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export async function POST(request: Request) {
  try {
    const body: OrderBody = await request.json();
    const { items, customerInfo, pickupTime, locale } = body;

    // Basic validation
    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items in order" }, { status: 400 });
    }
    if (!customerInfo?.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!customerInfo?.phone?.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }
    if (!validatePhone(customerInfo.phone)) {
      return NextResponse.json({ error: "Please enter a valid phone number" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    // Validate business hours
    const hoursError = await validateBusinessHours(supabase, pickupTime);
    if (hoursError) {
      return NextResponse.json({ error: hoursError }, { status: 400 });
    }

    // Validate items exist, are available, and prices match DB
    const itemsError = await validateItems(supabase, items);
    if (itemsError) {
      return NextResponse.json({ error: itemsError }, { status: 400 });
    }

    const orderNumber = `LD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    // Convert pickup time "HH:MM" to a full ISO timestamp (today's date)
    let pickupTimestamp: string | null = null;
    if (pickupTime) {
      if (pickupTime.includes("T") || pickupTime.includes("-")) {
        pickupTimestamp = pickupTime;
      } else {
        const today = new Date().toISOString().split("T")[0];
        pickupTimestamp = `${today}T${pickupTime}:00`;
      }
    }

    // Compute tax server-side using DB-verified prices
    const subtotal = items.reduce((sum, item) => {
      const modTotal = item.modifiers.reduce(
        (m, mod) => m + mod.priceAdjustment,
        0
      );
      return sum + (item.price + modTotal) * item.quantity;
    }, 0);
    const taxGst = subtotal * GST_RATE;
    const taxQst = subtotal * QST_RATE;
    const total = subtotal + taxGst + taxQst;

    // Persist order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: customerInfo.name.trim(),
        customer_phone: customerInfo.phone.trim(),
        pickup_time: pickupTimestamp,
        status: "new",
        subtotal: subtotal.toFixed(2),
        tax_gst: taxGst.toFixed(2),
        tax_qst: taxQst.toFixed(2),
        total: total.toFixed(2),
        locale: locale || "en",
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Failed to save order:", orderError);
      return NextResponse.json(
        { error: "Failed to save order" },
        { status: 500 }
      );
    }

    // Persist order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId || null,
      menu_item_name: item.name,
      price: item.price.toFixed(2),
      quantity: item.quantity,
      modifiers: item.modifiers,
    }));

    const { error: orderItemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      console.error("Failed to save order items:", orderItemsError);
      return NextResponse.json(
        { error: "Failed to save order details" },
        { status: 500 }
      );
    }

    // Send notification email via Resend
    if (process.env.RESEND_API_KEY) {
      const itemsList = items
        .map((item) => {
          const modText =
            item.modifiers.length > 0
              ? ` (${item.modifiers.map((m) => `${m.name}: ${m.option}`).join(", ")})`
              : "";
          return `  ${item.quantity}x ${item.name}${modText} — $${((item.price + item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0)) * item.quantity).toFixed(2)}`;
        })
        .join("\n");

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
            to: process.env.CAFE_EMAIL || "cafe@cafeleden.com",
            subject: `New Order ${orderNumber} — ${customerInfo.name} (Pickup: ${pickupTime || "ASAP"})`,
            html: `
              <h2>New Pickup Order — ${orderNumber}</h2>
              <p><strong>Customer:</strong> ${customerInfo.name}</p>
              <p><strong>Phone:</strong> ${customerInfo.phone}</p>
              <p><strong>Pickup Time:</strong> ${pickupTime || "ASAP"}</p>
              <hr>
              <h3>Items</h3>
              <pre>${itemsList}</pre>
              <hr>
              <p><strong>Estimated Total:</strong> $${total.toFixed(2)} CAD (pay in person)</p>
            `,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send notification email:", emailError);
      }
    }

    console.log(
      `[Order ${orderNumber}] ${customerInfo.name} (${customerInfo.phone}) — Pickup: ${pickupTime || "ASAP"} — $${total.toFixed(2)}`
    );

    return NextResponse.json({ orderNumber });
  } catch (error) {
    console.error("Order error:", error);
    return NextResponse.json(
      { error: "Failed to submit order" },
      { status: 500 }
    );
  }
}
