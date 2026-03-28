"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Upload, ImageIcon, X, Loader2 } from "lucide-react";

type Category = {
  id: string;
  name_en: string;
};

type ModifierOption = {
  name_en: string;
  name_fr: string;
  price_adjustment: number;
};

type Modifier = {
  name_en: string;
  name_fr: string;
  options: ModifierOption[];
};

type MenuItemData = {
  id?: string;
  name_en: string;
  name_fr: string;
  description_en: string;
  description_fr: string;
  price: number;
  category_id: string;
  available: boolean;
  image_url?: string | null;
  modifiers: Modifier[];
};

type Props = {
  categories: Category[];
  initialData?: MenuItemData;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

export function MenuItemForm({
  categories,
  initialData,
  action,
  submitLabel,
}: Props) {
  const [available, setAvailable] = useState(initialData?.available ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(
    initialData?.image_url ?? null
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modifiers, setModifiers] = useState<Modifier[]>(
    initialData?.modifiers ?? []
  );

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const body = new FormData();
    body.append("file", file);

    const res = await fetch("/api/upload-menu-image", { method: "POST", body });
    const data = await res.json();

    if (!res.ok) {
      alert(`Upload failed: ${data.error}`);
      setUploading(false);
      return;
    }

    setImageUrl(data.url);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage() {
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addModifier() {
    setModifiers([
      ...modifiers,
      { name_en: "", name_fr: "", options: [{ name_en: "", name_fr: "", price_adjustment: 0 }] },
    ]);
  }

  function removeModifier(idx: number) {
    setModifiers(modifiers.filter((_, i) => i !== idx));
  }

  function updateModifier(idx: number, field: "name_en" | "name_fr", value: string) {
    const updated = [...modifiers];
    updated[idx] = { ...updated[idx], [field]: value };
    setModifiers(updated);
  }

  function addOption(modIdx: number) {
    const updated = [...modifiers];
    updated[modIdx].options.push({ name_en: "", name_fr: "", price_adjustment: 0 });
    setModifiers(updated);
  }

  function removeOption(modIdx: number, optIdx: number) {
    const updated = [...modifiers];
    updated[modIdx].options = updated[modIdx].options.filter(
      (_, i) => i !== optIdx
    );
    setModifiers(updated);
  }

  function updateOption(
    modIdx: number,
    optIdx: number,
    field: string,
    value: string | number
  ) {
    const updated = [...modifiers];
    (updated[modIdx].options[optIdx] as Record<string, string | number>)[field] = value;
    setModifiers(updated);
  }

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      {initialData?.id && (
        <input type="hidden" name="id" value={initialData.id} />
      )}
      <input type="hidden" name="available" value={available.toString()} />
      <input type="hidden" name="image_url" value={imageUrl ?? ""} />
      <input
        type="hidden"
        name="modifiers_json"
        value={JSON.stringify(modifiers)}
      />

      {/* Image */}
      <div className="space-y-2">
        <Label>Photo</Label>
        <div className="flex items-start gap-4">
          {imageUrl ? (
            <div className="relative group">
              <img
                src={imageUrl}
                alt="Menu item"
                className="h-32 w-32 rounded-lg object-cover border border-stone-200"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="h-32 w-32 rounded-lg border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400">
              <ImageIcon className="h-8 w-8 mb-1" />
              <span className="text-xs">No photo</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Upload className="mr-1 h-3 w-3" />
              )}
              {uploading ? "Uploading..." : imageUrl ? "Change Photo" : "Upload Photo"}
            </Button>
            {imageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeImage}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Names */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name_en">Name (English)</Label>
          <Input
            id="name_en"
            name="name_en"
            defaultValue={initialData?.name_en}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name_fr">Name (French)</Label>
          <Input
            id="name_fr"
            name="name_fr"
            defaultValue={initialData?.name_fr}
            required
          />
        </div>
      </div>

      {/* Descriptions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="description_en">Description (English)</Label>
          <Textarea
            id="description_en"
            name="description_en"
            defaultValue={initialData?.description_en}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description_fr">Description (French)</Label>
          <Textarea
            id="description_fr"
            name="description_fr"
            defaultValue={initialData?.description_fr}
            rows={3}
          />
        </div>
      </div>

      {/* Price & Category */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initialData?.price}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category_id">Category</Label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={initialData?.category_id}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            required
          >
            <option value="">Select...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Available</Label>
          <div className="pt-1">
            <Switch checked={available} onCheckedChange={setAvailable} />
          </div>
        </div>
      </div>

      {/* Modifiers */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Modifiers</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addModifier}>
              <Plus className="mr-1 h-3 w-3" />
              Add Modifier
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {modifiers.length === 0 && (
            <p className="text-sm text-stone-400">No modifiers</p>
          )}
          {modifiers.map((mod, modIdx) => (
            <div
              key={modIdx}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Modifier name (EN)"
                    value={mod.name_en}
                    onChange={(e) =>
                      updateModifier(modIdx, "name_en", e.target.value)
                    }
                  />
                  <Input
                    placeholder="Modifier name (FR)"
                    value={mod.name_fr}
                    onChange={(e) =>
                      updateModifier(modIdx, "name_fr", e.target.value)
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeModifier(modIdx)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="pl-4 space-y-2">
                <p className="text-xs font-medium text-stone-500">Options</p>
                {mod.options.map((opt, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <Input
                      placeholder="Option (EN)"
                      value={opt.name_en}
                      onChange={(e) =>
                        updateOption(modIdx, optIdx, "name_en", e.target.value)
                      }
                      className="text-sm"
                    />
                    <Input
                      placeholder="Option (FR)"
                      value={opt.name_fr}
                      onChange={(e) =>
                        updateOption(modIdx, optIdx, "name_fr", e.target.value)
                      }
                      className="text-sm"
                    />
                    <Input
                      placeholder="+$"
                      type="number"
                      step="0.01"
                      value={opt.price_adjustment}
                      onChange={(e) =>
                        updateOption(
                          modIdx,
                          optIdx,
                          "price_adjustment",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-20 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeOption(modIdx, optIdx)}
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addOption(modIdx)}
                  className="text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Option
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
