"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  updateMenuItemStatus,
  deleteMenuItem,
} from "@/app/admin/(dashboard)/menu/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MENU_STATUS, type MenuStatus } from "@/components/admin/status";
import { cn } from "@/lib/utils";
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

// value -> label map so <SelectValue> renders the label, not the raw key.
const STATUS_ITEMS: Record<string, string> = Object.fromEntries(
  (Object.keys(MENU_STATUS) as MenuStatus[]).map((s) => [s, MENU_STATUS[s].label])
);

export function MenuItemRow({ item }: Props) {
  const [isPending, startTransition] = useTransition();
  const currentStatus = (item.status ??
    (item.available ? "available" : "hidden")) as MenuStatus;
  const meta = MENU_STATUS[currentStatus] ?? MENU_STATUS.available;

  function handleStatusChange(newStatus: MenuStatus) {
    if (newStatus === currentStatus) return;
    startTransition(async () => {
      await updateMenuItemStatus(item.id, newStatus);
      toast.success(`${item.name_en} → ${MENU_STATUS[newStatus].label}`);
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
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5 transition-colors last:border-b-0 hover:bg-muted/50",
        isPending && "opacity-50"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {/* Thumbnail */}
        <div
          className={cn(
            "h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted",
            currentStatus === "hidden" && "opacity-50"
          )}
        >
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.name_en}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate font-sans text-sm font-medium text-foreground">
            {item.name_en}
          </p>
          <p className="truncate text-xs text-muted-foreground">{item.name_fr}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-medium tabular-nums text-foreground">
          ${Number(item.price).toFixed(2)}
        </span>

        {/* Status control */}
        <Select
          items={STATUS_ITEMS}
          value={currentStatus}
          onValueChange={(value) => handleStatusChange(value as MenuStatus)}
          disabled={isPending}
        >
          <SelectTrigger
            size="sm"
            aria-label="Change status"
            className={cn("w-28 font-medium", meta.badge)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(MENU_STATUS) as MenuStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {MENU_STATUS[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          nativeButton={false}
          render={<Link href={`/admin/menu/${item.id}/edit`} />}
          aria-label={`Edit ${item.name_en}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Delete ${item.name_en}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
