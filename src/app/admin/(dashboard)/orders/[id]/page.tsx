import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderCard, type Order } from "@/components/admin/order-card";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params;
  return {
    title: "Order detail",
    description: "Review an order's customer, items, status, and pricing.",
  };
}

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
    <div className="max-w-2xl space-y-4">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href="/admin/orders" />}
        className="-ml-2 text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Button>

      <AdminPageHeader
        title={`Order ${typedOrder.order_number}`}
        subtitle={new Date(typedOrder.created_at).toLocaleString("en-CA")}
      />

      <OrderCard order={typedOrder} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle as="h2" className="font-sans text-sm font-semibold">
            Pricing breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">
              ${Number(typedOrder.subtotal).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">GST (5%)</span>
            <span className="tabular-nums">
              ${Number(typedOrder.tax_gst).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">QST (9.975%)</span>
            <span className="tabular-nums">
              ${Number(typedOrder.tax_qst).toFixed(2)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">
              ${Number(typedOrder.total).toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
