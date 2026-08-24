"use client";

import { useCallback, useRef, useState } from "react";
import { MenuItemForm } from "@/components/admin/menu-item-form";
import { SettingsForm } from "@/components/admin/settings-form";
import { OrdersDashboard } from "@/components/admin/orders-dashboard";
import type { Order } from "@/components/admin/order-card";
import { Button } from "@/components/ui/button";

type SettingsInitialData = React.ComponentProps<
  typeof SettingsForm
>["initialData"];

function useDelayedAction() {
  const resolveRef = useRef<(() => void) | null>(null);

  const wait = useCallback(
    () =>
      new Promise<void>((resolve) => {
        resolveRef.current = () => {
          resolveRef.current = null;
          resolve();
        };
      }),
    [],
  );

  const resolve = useCallback(() => {
    resolveRef.current?.();
  }, []);

  return { wait, resolve };
}

function useHydrationMarker() {
  return useCallback((node: HTMLDivElement | null) => {
    node?.setAttribute("data-preview-hydrated", "true");
  }, []);
}

async function previewOrderingAction(enabled: boolean) {
  return { ok: true as const, enabled };
}

type PreviewTransitionAction = NonNullable<
  React.ComponentProps<typeof OrdersDashboard>["transitionAction"]
>;

export function OrdersDashboardPreview({
  initialOrders,
  initialRefreshedAt,
  initialOrderingEnabled,
  initialError,
  networkEnabled,
}: {
  initialOrders: Order[];
  initialRefreshedAt: string | null;
  initialOrderingEnabled: boolean | null;
  initialError: boolean;
  networkEnabled: boolean;
}) {
  const [transitionCount, setTransitionCount] = useState(0);
  const previewTransitionAction = useCallback<PreviewTransitionAction>(
    async (input) => {
      setTransitionCount((count) => count + 1);
      return {
        ok: true,
        order: {
          id: input.orderId,
          status: input.newStatus,
          statusVersion: input.expectedVersion + 1,
          updatedAt: new Date().toISOString(),
        },
      };
    },
    [],
  );

  return (
    <div>
      <output className="sr-only" data-testid="preview-transition-count">
        {transitionCount}
      </output>
      <OrdersDashboard
        initialOrders={initialOrders}
        initialRefreshedAt={initialRefreshedAt}
        initialOrderingEnabled={initialOrderingEnabled}
        initialError={initialError}
        networkEnabled={networkEnabled}
        orderingAction={previewOrderingAction}
        reconcileOrderingMutation={false}
        transitionAction={previewTransitionAction}
      />
    </div>
  );
}

export function SettingsSaveRacePreview({
  initialData,
}: {
  initialData: SettingsInitialData;
}) {
  const delayedAction = useDelayedAction();
  const markHydrated = useHydrationMarker();

  return (
    <div ref={markHydrated} className="space-y-3">
      <SettingsForm
        initialData={initialData}
        action={async () => delayedAction.wait()}
        orderingAction={previewOrderingAction}
      />
      <Button
        type="button"
        variant="outline"
        size="default"
        onClick={delayedAction.resolve}
      >
        Resolve delayed settings save
      </Button>
    </div>
  );
}

export function MenuItemSaveRacePreview() {
  const delayedAction = useDelayedAction();
  const markHydrated = useHydrationMarker();

  return (
    <div ref={markHydrated} className="space-y-3">
      <MenuItemForm
        categories={[{ id: "preview-category", name_en: "Coffee" }]}
        initialData={{
          id: "preview-menu-item",
          name_en: "Preview latte",
          name_fr: "Latte aperçu",
          description_en: "Preview drink",
          description_fr: "Boisson aperçu",
          price: 5.25,
          category_id: "preview-category",
          available: true,
          status: "available",
          image_url: null,
          modifiers: [],
        }}
        action={async () => delayedAction.wait()}
        submitLabel="Save menu preview"
      />
      <Button
        type="button"
        variant="outline"
        size="default"
        onClick={delayedAction.resolve}
      >
        Resolve delayed menu save
      </Button>
    </div>
  );
}
