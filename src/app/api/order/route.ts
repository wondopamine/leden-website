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

export async function POST(request: Request) {
  try {
    const body: OrderBody = await request.json();
    const { items, customerInfo, pickupTime, locale } = body;

    const orderNumber = `LD-${Date.now().toString(36).toUpperCase()}`;

    // Convert pickup time "HH:MM" to a full ISO timestamp (today's date)
    let pickupTimestamp: string | null = null;
    if (pickupTime) {
      if (pickupTime.includes("T") || pickupTime.includes("-")) {
        // Already a full timestamp/date string
        pickupTimestamp = pickupTime;
      } else {
        // Time-only like "10:30" — attach today's date
        const today = new Date().toISOString().split("T")[0];
        pickupTimestamp = `${today}T${pickupTime}:00`;
      }
    }

    // Compute tax server-side for integrity
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

    // Persist to Supabase if configured
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
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
      } else if (order) {
        const orderItems = items.map((item) => ({
          order_id: order.id,
          menu_item_id: item.menuItemId || null,
          menu_item_name: item.name,
          price: item.price.toFixed(2),
          quantity: item.quantity,
          modifiers: item.modifiers,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          console.error("Failed to save order items:", itemsError);
        }
      }
    }

    // Send notification email via Resend
    const itemsList = items
      .map((item) => {
        const modText =
          item.modifiers.length > 0
            ? ` (${item.modifiers.map((m) => `${m.name}: ${m.option}`).join(", ")})`
            : "";
        return `  ${item.quantity}x ${item.name}${modText} — $${((item.price + item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0)) * item.quantity).toFixed(2)}`;
      })
      .join("\n");

    if (process.env.RESEND_API_KEY) {
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
