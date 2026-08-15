import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCafeWeekday, getCafeMinutes } from "@/lib/hours";

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

type OrderErrorCode =
  | "EMPTY_ORDER"
  | "NAME_REQUIRED"
  | "PHONE_REQUIRED"
  | "PHONE_INVALID"
  | "SERVICE_UNAVAILABLE"
  | "CAFE_CLOSED_TODAY"
  | "CAFE_CLOSED_NOW"
  | "PICKUP_TIME_INVALID"
  | "ITEM_REMOVED"
  | "ITEM_UNAVAILABLE"
  | "PRICE_CHANGED"
  | "ORDER_SAVE_FAILED"
  | "ORDER_ITEMS_SAVE_FAILED"
  | "UNKNOWN";

type OrderIssue = {
  code: OrderErrorCode;
  hours?: { open: string; close: string };
};

const GST_RATE = 0.05;
const QST_RATE = 0.09975;

function errorResponse(
  locale: string | undefined,
  issue: OrderIssue,
  status: number,
) {
  const isFrench = locale === "fr";
  const hours = issue.hours ? `${issue.hours.open}–${issue.hours.close}` : "";
  const messages: Record<OrderErrorCode, { en: string; fr: string }> = {
    EMPTY_ORDER: {
      en: "Your cart is empty. Add an item from the menu and try again.",
      fr: "Votre panier est vide. Ajoutez un article du menu et réessayez.",
    },
    NAME_REQUIRED: {
      en: "Enter your name so we can identify your pickup order.",
      fr: "Indiquez votre nom afin que nous puissions identifier votre commande.",
    },
    PHONE_REQUIRED: {
      en: "Enter a phone number so the cafe can contact you about your order.",
      fr: "Indiquez un numéro de téléphone afin que le café puisse vous joindre au sujet de votre commande.",
    },
    PHONE_INVALID: {
      en: "Enter a valid phone number, including the area code, and try again.",
      fr: "Indiquez un numéro de téléphone valide, avec l’indicatif régional, puis réessayez.",
    },
    SERVICE_UNAVAILABLE: {
      en: "Ordering is temporarily unavailable. Keep your cart and try again in a few minutes.",
      fr: "Les commandes sont temporairement indisponibles. Conservez votre panier et réessayez dans quelques minutes.",
    },
    CAFE_CLOSED_TODAY: {
      en: "The cafe is closed today. Keep your cart and return during business hours.",
      fr: "Le café est fermé aujourd’hui. Conservez votre panier et revenez pendant les heures d’ouverture.",
    },
    CAFE_CLOSED_NOW: {
      en: `Pickup is currently closed${hours ? `. Today’s hours are ${hours}` : ""}. Keep your cart and try again during business hours.`,
      fr: `La cueillette est présentement fermée${hours ? `. Les heures aujourd’hui sont de ${hours}` : ""}. Conservez votre panier et réessayez pendant les heures d’ouverture.`,
    },
    PICKUP_TIME_INVALID: {
      en: `Choose a pickup time${hours ? ` between ${hours}` : " during business hours"} and try again.`,
      fr: `Choisissez une heure de cueillette${hours ? ` entre ${hours}` : " pendant les heures d’ouverture"}, puis réessayez.`,
    },
    ITEM_REMOVED: {
      en: "An item is no longer on the menu. Review your cart and the menu before trying again.",
      fr: "Un article n’est plus au menu. Vérifiez votre panier et le menu avant de réessayer.",
    },
    ITEM_UNAVAILABLE: {
      en: "An item in your cart is unavailable. Review your cart and choose another item before trying again.",
      fr: "Un article de votre panier est indisponible. Vérifiez votre panier et choisissez un autre article avant de réessayer.",
    },
    PRICE_CHANGED: {
      en: "A menu price changed. Refresh the menu, review your cart, and try again.",
      fr: "Un prix a changé. Actualisez le menu, vérifiez votre panier et réessayez.",
    },
    ORDER_SAVE_FAILED: {
      en: "We couldn’t place the order. Keep your cart and try again.",
      fr: "Nous n’avons pas pu passer la commande. Conservez votre panier et réessayez.",
    },
    ORDER_ITEMS_SAVE_FAILED: {
      en: "We couldn’t finish saving the order details. Keep your cart and contact the cafe before trying again.",
      fr: "Nous n’avons pas pu enregistrer tous les détails. Conservez votre panier et communiquez avec le café avant de réessayer.",
    },
    UNKNOWN: {
      en: "We couldn’t place the order. Keep your cart and try again.",
      fr: "Nous n’avons pas pu passer la commande. Conservez votre panier et réessayez.",
    },
  };
  const message = messages[issue.code];

  return NextResponse.json(
    { code: issue.code, error: isFrench ? message.fr : message.en },
    { status },
  );
}

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
  // Evaluate in the café's timezone so a UTC-hosted server agrees with the client UI.
  const dayName = getCafeWeekday();
  const today = hours.find((h) => h.day === dayName);

  if (!today || today.closed) {
    return { code: "CAFE_CLOSED_TODAY" } satisfies OrderIssue;
  }

  const [openH, openM] = today.open.split(":").map(Number);
  const [closeH, closeM] = today.close.split(":").map(Number);
  const nowMin = getCafeMinutes();
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  if (nowMin < openMin || nowMin >= closeMin) {
    return {
      code: "CAFE_CLOSED_NOW",
      hours: { open: today.open, close: today.close },
    } satisfies OrderIssue;
  }

  // Validate pickup time is within hours
  if (pickupTime && !pickupTime.includes("T")) {
    const [pH, pM] = pickupTime.split(":").map(Number);
    const pickupMin = pH * 60 + pM;
    if (pickupMin < openMin || pickupMin >= closeMin) {
      return {
        code: "PICKUP_TIME_INVALID",
        hours: { open: today.open, close: today.close },
      } satisfies OrderIssue;
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
      return { code: "ITEM_REMOVED" } satisfies OrderIssue;
    }
    if (dbItem.status !== "available") {
      return { code: "ITEM_UNAVAILABLE" } satisfies OrderIssue;
    }
    // Allow small floating point differences (< 1 cent)
    if (Math.abs(Number(dbItem.price) - item.price) > 0.01) {
      return { code: "PRICE_CHANGED" } satisfies OrderIssue;
    }
  }
  return null;
}

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export async function POST(request: Request) {
  let requestLocale: string | undefined;

  try {
    const body: OrderBody = await request.json();
    const { items, customerInfo, pickupTime, locale } = body;
    requestLocale = locale;

    // Basic validation
    if (!items || items.length === 0) {
      return errorResponse(locale, { code: "EMPTY_ORDER" }, 400);
    }
    if (!customerInfo?.name?.trim()) {
      return errorResponse(locale, { code: "NAME_REQUIRED" }, 400);
    }
    if (!customerInfo?.phone?.trim()) {
      return errorResponse(locale, { code: "PHONE_REQUIRED" }, 400);
    }
    if (!validatePhone(customerInfo.phone)) {
      return errorResponse(locale, { code: "PHONE_INVALID" }, 400);
    }

    const supabase = getSupabase();
    if (!supabase) {
      return errorResponse(locale, { code: "SERVICE_UNAVAILABLE" }, 503);
    }

    // Validate business hours
    const hoursError = await validateBusinessHours(supabase, pickupTime);
    if (hoursError) {
      return errorResponse(locale, hoursError, 400);
    }

    // Validate items exist, are available, and prices match DB
    const itemsError = await validateItems(supabase, items);
    if (itemsError) {
      return errorResponse(locale, itemsError, 400);
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
      return errorResponse(locale, { code: "ORDER_SAVE_FAILED" }, 500);
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
      return errorResponse(locale, { code: "ORDER_ITEMS_SAVE_FAILED" }, 500);
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
    return errorResponse(requestLocale, { code: "UNKNOWN" }, 500);
  }
}
