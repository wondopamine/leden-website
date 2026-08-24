"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function OrdersError({ error, reset }: Props) {
  const recoveryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    console.error("Could not load order history:", error);
    recoveryRef.current?.focus();
  }, [error]);

  return (
    <section
      ref={recoveryRef}
      tabIndex={-1}
      aria-labelledby="orders-error-heading"
      className="max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <h1 id="orders-error-heading" className="font-sans text-lg font-semibold">
        Order history could not be loaded
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Check your connection and try again. Live orders are still available from the dashboard.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="default" size="default" onClick={reset}>
          Retry loading orders
        </Button>
        <Link
          href="/admin"
          className={buttonVariants({ variant: "outline" })}
        >
          Return to live orders
        </Link>
      </div>
    </section>
  );
}
