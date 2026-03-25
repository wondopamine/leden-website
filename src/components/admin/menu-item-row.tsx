"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  toggleMenuItemAvailability,
  deleteMenuItem,
} from "@/app/admin/(dashboard)/menu/actions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  item: {
    id: string;
    name_en: string;
    name_fr: string;
    price: number;
    available: boolean;
    category: { id: string; name_en: string } | null;
  };
};

export function MenuItemRow({ item }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      await toggleMenuItemAvailability(item.id, checked);
      toast.success(
        `${item.name_en} ${checked ? "available" : "unavailable"}`
      );
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${item.name_en}"?`)) return;
    startTransition(async () => {
      await deleteMenuItem(item.id);
      toast.success(`${item.name_en} deleted`);
    });
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg border bg-white px-4 py-3 ${isPending ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-4">
        <Switch
          checked={item.available}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
        <div>
          <p className="text-sm font-medium">{item.name_en}</p>
          <p className="text-xs text-stone-400">{item.name_fr}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          ${Number(item.price).toFixed(2)}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" render={<Link href={`/admin/menu/${item.id}/edit`} />}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}
