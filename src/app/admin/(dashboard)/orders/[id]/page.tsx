import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { OrderCard, type Order } from "@/components/admin/order-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .single();

  if (!order) notFound();

  const typedOrder = order as Order;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/admin/orders" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Order {typedOrder.order_number}
          </h1>
          <p className="text-sm text-stone-500">
            {new Date(typedOrder.created_at).toLocaleString("en-CA")}
          </p>
        </div>
      </div>

      <OrderCard order={typedOrder} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pricing Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">Subtotal</span>
            <span>${Number(typedOrder.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">GST (5%)</span>
            <span>${Number(typedOrder.tax_gst).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">QST (9.975%)</span>
            <span>${Number(typedOrder.tax_qst).toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 font-semibold">
            <span>Total</span>
            <span>${Number(typedOrder.total).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
