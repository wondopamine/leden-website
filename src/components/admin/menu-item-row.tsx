"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  updateMenuItemStatus,
  deleteMenuItem,
} from "@/app/admin/(dashboard)/menu/actions";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

type Props = {
  item: {
    id: string;
    name_en: string;
    name_fr: string;
    price: number;
    available: boolean;
    status?: string;
    image_url?: string | null;
    category: { id: string; name_en: string } | null;
  };
};

const statusLabels: Record<string, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-green-100 text-green-800" },
  sold_out: { label: "Sold Out", className: "bg-amber-100 text-amber-800" },
  hidden: { label: "Hidden", className: "bg-stone-100 text-stone-500" },
};

export function MenuItemRow({ item }: Props) {
  const [isPending, startTransition] = useTransition();
  const currentStatus = item.status ?? (item.available ? "available" : "hidden");

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as "available" | "sold_out" | "hidden";
    startTransition(async () => {
      await updateMenuItemStatus(item.id, newStatus);
      toast.success(`${item.name_en} → ${statusLabels[newStatus].label}`);
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${item.name_en}"?`)) return;
    startTransition(async () => {
      await deleteMenuItem(item.id);
      toast.success(`${item.name_en} deleted`);
    });
  }

  const style = statusLabels[currentStatus] ?? statusLabels.available;

  return (
    <div
      className={`flex items-center justify-between rounded-lg border bg-white px-4 py-3 ${isPending ? "opacity-50" : ""} ${currentStatus === "hidden" ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        {/* Thumbnail */}
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-stone-100">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.name_en}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-stone-300">
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Status dropdown */}
        <select
          value={currentStatus}
          onChange={handleStatusChange}
          disabled={isPending}
          className={`rounded-md border-0 px-2 py-1 text-xs font-medium ${style.className} cursor-pointer`}
        >
          <option value="available">Available</option>
          <option value="sold_out">Sold Out</option>
          <option value="hidden">Hidden</option>
        </select>

        <div>
          <p className="text-sm font-medium">{item.name_en}</p>
          <p className="text-xs text-stone-400">{item.name_fr}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          ${Number(item.price).toFixed(2)}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" nativeButton={false} render={<Link href={`/admin/menu/${item.id}/edit`} />}>
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
