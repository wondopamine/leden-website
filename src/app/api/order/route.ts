import { NextResponse } from "next/server";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
  modifiers: { name: string; option: string; priceAdjustment: number }[];
};

type OrderBody = {
  items: OrderItem[];
  customerInfo: { name: string; phone: string };
  pickupTime: string | null;
  locale: string;
  total: number;
};

export async function POST(request: Request) {
  try {
    const body: OrderBody = await request.json();
    const { items, customerInfo, pickupTime, total } = body;

    const orderNumber = `LD-${Date.now().toString(36).toUpperCase()}`;

    const itemsList = items
      .map((item) => {
        const modText =
          item.modifiers.length > 0
            ? ` (${item.modifiers.map((m) => `${m.name}: ${m.option}`).join(", ")})`
            : "";
        return `  ${item.quantity}x ${item.name}${modText} — $${((item.price + item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0)) * item.quantity).toFixed(2)}`;
      })
      .join("\n");

    // Send notification email to cafe via Resend
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
