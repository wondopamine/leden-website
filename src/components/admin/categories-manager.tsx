"use client";

import { useState, useTransition } from "react";
import {
  saveCategory,
  deleteCategory,
} from "@/app/admin/(dashboard)/categories/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        toast.error(`${cat.name_en || "Category"} was not saved`, {
          description: "Check the fields and your connection, then try again.",
        });
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
        toast.error(`${name} was not deleted`, {
          description: "Move its menu items to another category, then try again.",
        });
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
        toast.error("Category was not added", {
          description: "Check the required fields and your connection, then try again.",
        });
      }
    });
  }

  return (
    <div aria-busy={isPending} className="max-w-3xl space-y-3">
      {categories.map((cat) => (
        <section
          key={cat.id}
          aria-labelledby={`category-${cat.id}-heading`}
          className="rounded-xl border border-border bg-card p-3"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id={`category-${cat.id}-heading`}
              className="font-sans text-sm font-semibold text-foreground"
            >
              {cat.name_en || "Unnamed category"}
            </h2>
            <div className="flex items-center gap-1">
              {editedIds.has(cat.id) && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleSave(cat)}
                  disabled={isPending}
                  aria-busy={isPending}
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
                aria-busy={isPending}
                aria-label={`Delete ${cat.name_en || "category"}`}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[6rem_1fr_1fr_9rem]">
            <div className="space-y-1.5">
              <Label htmlFor={`category-${cat.id}-sort`}>Sort order</Label>
              <Input
                id={`category-${cat.id}-sort`}
                value={cat.sort_order}
                onChange={(e) =>
                  handleFieldChange(
                    cat.id,
                    "sort_order",
                    parseInt(e.target.value) || 0
                  )
                }
                className="text-sm tabular-nums"
                type="number"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`category-${cat.id}-name-en`}>Name (EN)</Label>
              <Input
                id={`category-${cat.id}-name-en`}
                value={cat.name_en}
                onChange={(e) =>
                  handleFieldChange(cat.id, "name_en", e.target.value)
                }
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`category-${cat.id}-name-fr`}>Name (FR)</Label>
              <Input
                id={`category-${cat.id}-name-fr`}
                value={cat.name_fr}
                onChange={(e) =>
                  handleFieldChange(cat.id, "name_fr", e.target.value)
                }
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`category-${cat.id}-slug`}>Slug</Label>
              <Input
                id={`category-${cat.id}-slug`}
                value={cat.slug}
                onChange={(e) =>
                  handleFieldChange(cat.id, "slug", e.target.value)
                }
                className="text-sm"
              />
            </div>
          </div>
        </section>
      ))}

      <section
        aria-labelledby="new-category-heading"
        className="rounded-xl border border-dashed border-border bg-muted/50 p-3"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            id="new-category-heading"
            className="font-sans text-sm font-semibold text-foreground"
          >
            Add category
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={isPending || !newCat.name_en || !newCat.slug}
            aria-busy={isPending}
          >
            <Plus />
            Add
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-category-name-en">Name (EN)</Label>
            <Input
              id="new-category-name-en"
              value={newCat.name_en}
              onChange={(e) => setNewCat({ ...newCat, name_en: e.target.value })}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-category-name-fr">Name (FR)</Label>
            <Input
              id="new-category-name-fr"
              value={newCat.name_fr}
              onChange={(e) => setNewCat({ ...newCat, name_fr: e.target.value })}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-category-slug">Slug</Label>
            <Input
              id="new-category-slug"
              value={newCat.slug}
              onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
              className="text-sm"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
