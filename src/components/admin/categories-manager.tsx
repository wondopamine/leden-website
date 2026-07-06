"use client";

import { useState, useTransition } from "react";
import {
  saveCategory,
  deleteCategory,
} from "@/app/admin/(dashboard)/categories/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

type Category = {
  id: string;
  name_en: string;
  name_fr: string;
  slug: string;
  sort_order: number;
};

type Props = {
  initialCategories: Category[];
};

export function CategoriesManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [newCat, setNewCat] = useState({
    name_en: "",
    name_fr: "",
    slug: "",
  });

  function handleFieldChange(id: string, field: string, value: string | number) {
    setCategories(
      categories.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      )
    );
    setEditedIds((prev) => new Set(prev).add(id));
  }

  function handleSave(cat: Category) {
    startTransition(async () => {
      try {
        await saveCategory({
          id: cat.id,
          name_en: cat.name_en,
          name_fr: cat.name_fr,
          slug: cat.slug,
          sort_order: cat.sort_order,
        });
        setEditedIds((prev) => {
          const next = new Set(prev);
          next.delete(cat.id);
          return next;
        });
        toast.success(`${cat.name_en} saved`);
      } catch {
        toast.error("Failed to save");
      }
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Menu items in this category must be reassigned first.`)) return;
    startTransition(async () => {
      try {
        await deleteCategory(id);
        setCategories(categories.filter((c) => c.id !== id));
        toast.success(`${name} deleted`);
      } catch {
        toast.error("Cannot delete — category may have menu items");
      }
    });
  }

  function handleAdd() {
    if (!newCat.name_en || !newCat.slug) return;
    startTransition(async () => {
      try {
        await saveCategory({
          name_en: newCat.name_en,
          name_fr: newCat.name_fr,
          slug: newCat.slug,
          sort_order: categories.length + 1,
        });
        setNewCat({ name_en: "", name_fr: "", slug: "" });
        toast.success("Category added — refresh to see it");
      } catch {
        toast.error("Failed to add category");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-2">
      {/* Existing categories */}
      {categories.map((cat) => (
        <div
          key={cat.id}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3"
        >
          <Input
            value={cat.sort_order}
            onChange={(e) =>
              handleFieldChange(cat.id, "sort_order", parseInt(e.target.value) || 0)
            }
            className="w-14 shrink-0 text-center text-sm tabular-nums"
            type="number"
            aria-label={`${cat.name_en || "Category"} sort order`}
          />
          <Input
            value={cat.name_en}
            onChange={(e) => handleFieldChange(cat.id, "name_en", e.target.value)}
            placeholder="Name (EN)"
            className="min-w-[7rem] flex-1 text-sm"
            aria-label="Name (EN)"
          />
          <Input
            value={cat.name_fr}
            onChange={(e) => handleFieldChange(cat.id, "name_fr", e.target.value)}
            placeholder="Name (FR)"
            className="min-w-[7rem] flex-1 text-sm"
            aria-label="Name (FR)"
          />
          <Input
            value={cat.slug}
            onChange={(e) => handleFieldChange(cat.id, "slug", e.target.value)}
            placeholder="slug"
            className="w-28 shrink-0 text-sm"
            aria-label="Slug"
          />
          {editedIds.has(cat.id) && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleSave(cat)}
              disabled={isPending}
              aria-label={`Save ${cat.name_en || "category"}`}
            >
              <Save />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(cat.id, cat.name_en)}
            disabled={isPending}
            aria-label={`Delete ${cat.name_en || "category"}`}
          >
            <Trash2 className="text-destructive" />
          </Button>
        </div>
      ))}

      {/* Add new */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/50 p-3">
        <Input
          value={newCat.name_en}
          onChange={(e) => setNewCat({ ...newCat, name_en: e.target.value })}
          placeholder="New category (EN)"
          className="min-w-[7rem] flex-1 text-sm"
          aria-label="New category name (EN)"
        />
        <Input
          value={newCat.name_fr}
          onChange={(e) => setNewCat({ ...newCat, name_fr: e.target.value })}
          placeholder="(FR)"
          className="min-w-[7rem] flex-1 text-sm"
          aria-label="New category name (FR)"
        />
        <Input
          value={newCat.slug}
          onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
          placeholder="slug"
          className="w-28 shrink-0 text-sm"
          aria-label="New category slug"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={isPending || !newCat.name_en || !newCat.slug}
        >
          <Plus />
          Add
        </Button>
      </div>
    </div>
  );
}
