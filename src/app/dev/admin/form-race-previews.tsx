"use client";

import { useCallback, useRef } from "react";
import { MenuItemForm } from "@/components/admin/menu-item-form";
import { SettingsForm } from "@/components/admin/settings-form";
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

export function SettingsSaveRacePreview({
  initialData,
}: {
  initialData: SettingsInitialData;
}) {
  const delayedAction = useDelayedAction();

  return (
    <div className="space-y-3">
      <SettingsForm
        initialData={initialData}
        action={async () => delayedAction.wait()}
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

  return (
    <div className="space-y-3">
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
