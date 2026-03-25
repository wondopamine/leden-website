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
    <div className="space-y-4 max-w-2xl">
      {/* Existing categories */}
      {categories.map((cat) => (
        <div
          key={cat.id}
          className="flex items-center gap-2 rounded-lg border bg-white px-4 py-3"
        >
          <Input
            value={cat.sort_order}
            onChange={(e) =>
              handleFieldChange(cat.id, "sort_order", parseInt(e.target.value) || 0)
            }
            className="w-16 text-center text-sm"
            type="number"
          />
          <Input
            value={cat.name_en}
            onChange={(e) => handleFieldChange(cat.id, "name_en", e.target.value)}
            placeholder="Name (EN)"
            className="text-sm"
          />
          <Input
            value={cat.name_fr}
            onChange={(e) => handleFieldChange(cat.id, "name_fr", e.target.value)}
            placeholder="Name (FR)"
            className="text-sm"
          />
          <Input
            value={cat.slug}
            onChange={(e) => handleFieldChange(cat.id, "slug", e.target.value)}
            placeholder="slug"
            className="w-28 text-sm"
          />
          {editedIds.has(cat.id) && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleSave(cat)}
              disabled={isPending}
            >
              <Save className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleDelete(cat.id, cat.name_en)}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ))}

      {/* Add new */}
      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-stone-50 px-4 py-3">
        <Input
          value={newCat.name_en}
          onChange={(e) => setNewCat({ ...newCat, name_en: e.target.value })}
          placeholder="New category (EN)"
          className="text-sm"
        />
        <Input
          value={newCat.name_fr}
          onChange={(e) => setNewCat({ ...newCat, name_fr: e.target.value })}
          placeholder="(FR)"
          className="text-sm"
        />
        <Input
          value={newCat.slug}
          onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
          placeholder="slug"
          className="w-28 text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={isPending || !newCat.name_en || !newCat.slug}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>
    </div>
  );
}
