"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Upload, ImageIcon, X, Loader2 } from "lucide-react";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";

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

type ScalarFields = {
  name_en: string;
  name_fr: string;
  description_en: string;
  description_fr: string;
  price: string;
  category_id: string;
};

export function MenuItemForm({
  categories,
  initialData,
  action,
  submitLabel,
}: Props) {
  const [fields, setFields] = useState<ScalarFields>({
    name_en: initialData?.name_en ?? "",
    name_fr: initialData?.name_fr ?? "",
    description_en: initialData?.description_en ?? "",
    description_fr: initialData?.description_fr ?? "",
    price: initialData?.price?.toString() ?? "",
    category_id: initialData?.category_id ?? "",
  });
  const [available, setAvailable] = useState(initialData?.available ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(
    initialData?.image_url ?? null
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modifiers, setModifiers] = useState<Modifier[]>(
    initialData?.modifiers ?? []
  );
  const [isPending, startTransition] = useTransition();
  const [isDirty, setIsDirty] = useState(false);
  const editRevisionRef = useRef(0);
  const [submissionMessage, setSubmissionMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [photoMessage, setPhotoMessage] = useState("");
  const isEdit = !!initialData?.id;
  const { confirmDiscard, suspendProtection, resumeProtection } =
    useUnsavedChanges(isDirty, () => setIsDirty(false));

  function markDirty() {
    editRevisionRef.current += 1;
    setIsDirty(true);
  }

  function updateField(field: keyof ScalarFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setPhotoMessage("Uploading photo…");
    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch("/api/upload-menu-image", {
        method: "POST",
        body,
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        url?: string;
      } | null;

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "The upload service returned no photo.");
      }

      setImageUrl(data.url);
      markDirty();
      setPhotoMessage("Photo uploaded. Save the menu item to keep it.");
    } catch {
      setPhotoMessage(
        "Photo was not uploaded. Check the file and your connection, then try again.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage() {
    setImageUrl(null);
    markDirty();
    setPhotoMessage("Photo removed. Save the menu item to keep this change.");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addModifier() {
    markDirty();
    setModifiers([
      ...modifiers,
      { name_en: "", name_fr: "", options: [{ name_en: "", name_fr: "", price_adjustment: 0 }] },
    ]);
  }

  function removeModifier(idx: number) {
    markDirty();
    setModifiers(modifiers.filter((_, i) => i !== idx));
  }

  function updateModifier(idx: number, field: "name_en" | "name_fr", value: string) {
    markDirty();
    const updated = [...modifiers];
    updated[idx] = { ...updated[idx], [field]: value };
    setModifiers(updated);
  }

  function addOption(modIdx: number) {
    markDirty();
    const updated = [...modifiers];
    updated[modIdx].options.push({ name_en: "", name_fr: "", price_adjustment: 0 });
    setModifiers(updated);
  }

  function removeOption(modIdx: number, optIdx: number) {
    markDirty();
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
    markDirty();
    const updated = [...modifiers];
    (updated[modIdx].options[optIdx] as Record<string, string | number>)[field] = value;
    setModifiers(updated);
  }

  function handleSubmit(formData: FormData) {
    setSubmissionMessage(null);
    const submittedRevision = editRevisionRef.current;
    // A successful create redirects from its server action. Suspend the guard
    // for this intentional save navigation; restore it if the request fails.
    if (!isEdit) {
      suspendProtection();
      setIsDirty(false);
    }
    startTransition(async () => {
      try {
        await action(formData);
        const hasNewerEdits = editRevisionRef.current !== submittedRevision;
        if (hasNewerEdits) {
          resumeProtection();
          setIsDirty(true);
        } else {
          setIsDirty(false);
        }
        const text = hasNewerEdits
          ? "Menu item changes saved. Newer edits are still unsaved."
          : isEdit
            ? "Menu item changes saved."
            : "Menu item created.";
        setSubmissionMessage({ tone: "success", text });
      } catch (error) {
        unstable_rethrow(error);
        resumeProtection();
        setIsDirty(true);
        setSubmissionMessage({
          tone: "error",
          text: "Menu item was not saved. Review the fields and your connection, then try again.",
        });
      }
    });
  }

  return (
    <form
      action={handleSubmit}
      onChange={markDirty}
      className="max-w-2xl space-y-5"
      aria-busy={isPending}
    >
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
        <Label htmlFor="menu-item-photo">Photo</Label>
        <div className="flex items-start gap-4">
          {imageUrl ? (
            <div className="relative">
              <Image
                src={imageUrl}
                alt="Menu item"
                width={128}
                height={128}
                className="h-32 w-32 rounded-lg border border-border object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                onClick={removeImage}
                aria-label="Remove photo"
                className="absolute -right-2 -top-2 rounded-full"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="h-32 w-32 rounded-lg border-2 border-dashed border-input flex flex-col items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8 mb-1" />
              <span className="text-xs">No photo</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              id="menu-item-photo"
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
              aria-busy={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Upload className="mr-1 h-3 w-3" />
              )}
              {uploading ? "Uploading…" : imageUrl ? "Change photo" : "Upload photo"}
            </Button>
            <p className="max-w-56 text-caption text-muted-foreground" aria-live="polite">
              {photoMessage}
            </p>
            {imageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeImage}
                className="text-destructive"
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
            value={fields.name_en}
            onChange={(event) => updateField("name_en", event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name_fr">Name (French)</Label>
          <Input
            id="name_fr"
            name="name_fr"
            value={fields.name_fr}
            onChange={(event) => updateField("name_fr", event.target.value)}
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
            value={fields.description_en}
            onChange={(event) =>
              updateField("description_en", event.target.value)
            }
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description_fr">Description (French)</Label>
          <Textarea
            id="description_fr"
            name="description_fr"
            value={fields.description_fr}
            onChange={(event) =>
              updateField("description_fr", event.target.value)
            }
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
            value={fields.price}
            onChange={(event) => updateField("price", event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category_id">Category</Label>
          <select
            id="category_id"
            name="category_id"
            value={fields.category_id}
            onChange={(event) =>
              updateField("category_id", event.target.value)
            }
            className="flex h-11 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-9 sm:px-2.5 sm:py-1 sm:text-sm"
            required
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="available">Available</Label>
          <div className="flex min-h-11 items-center gap-2 sm:min-h-9">
            <Switch
              id="available"
              checked={available}
              onCheckedChange={(checked) => {
                setAvailable(checked);
                markDirty();
              }}
            />
            <span className="text-sm text-muted-foreground">
              {available ? "Shown for ordering" : "Hidden from ordering"}
            </span>
          </div>
        </div>
      </div>

      {/* Modifiers */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle as="h2" className="font-sans text-sm">Modifiers</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addModifier}>
              <Plus className="mr-1 h-3 w-3" />
              Add modifier
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {modifiers.length === 0 && (
            <p className="text-sm text-muted-foreground">No modifiers</p>
          )}
          {modifiers.map((mod, modIdx) => (
            <div
              key={modIdx}
              className="border border-border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start gap-2">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`modifier-${modIdx}-name-en`}>
                      Modifier name (English)
                    </Label>
                    <Input
                      id={`modifier-${modIdx}-name-en`}
                      value={mod.name_en}
                      onChange={(e) =>
                        updateModifier(modIdx, "name_en", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`modifier-${modIdx}-name-fr`}>
                      Modifier name (French)
                    </Label>
                    <Input
                      id={`modifier-${modIdx}-name-fr`}
                      value={mod.name_fr}
                      onChange={(e) =>
                        updateModifier(modIdx, "name_fr", e.target.value)
                      }
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeModifier(modIdx)}
                  aria-label="Remove modifier"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3 border-l-2 border-border pl-3 sm:pl-4">
                <p className="text-sm font-medium text-foreground">Options</p>
                {mod.options.map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className="grid gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-[1fr_1fr_7rem_auto] sm:items-end"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor={`modifier-${modIdx}-option-${optIdx}-en`}>
                        Option (English)
                      </Label>
                      <Input
                        id={`modifier-${modIdx}-option-${optIdx}-en`}
                        value={opt.name_en}
                        onChange={(e) =>
                          updateOption(modIdx, optIdx, "name_en", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`modifier-${modIdx}-option-${optIdx}-fr`}>
                        Option (French)
                      </Label>
                      <Input
                        id={`modifier-${modIdx}-option-${optIdx}-fr`}
                        value={opt.name_fr}
                        onChange={(e) =>
                          updateOption(modIdx, optIdx, "name_fr", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`modifier-${modIdx}-option-${optIdx}-price`}>
                        Price change
                      </Label>
                      <Input
                        id={`modifier-${modIdx}-option-${optIdx}-price`}
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
                        className="tabular-nums"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeOption(modIdx, optIdx)}
                      aria-label="Remove option"
                    >
                      <Trash2 className="h-3 w-3" />
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
                  Add option
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          {isEdit ? "Saving menu item changes…" : "Creating menu item…"}
        </p>
      ) : submissionMessage ? (
        <p
          role={submissionMessage.tone === "error" ? "alert" : "status"}
          className={
            submissionMessage.tone === "error"
              ? "text-sm text-destructive"
              : "text-sm text-status-active-foreground"
          }
        >
          {submissionMessage.text}
        </p>
      ) : isDirty ? (
        <p role="status" className="text-sm text-muted-foreground">
          Unsaved changes
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          variant="default"
          size="default"
          disabled={isPending || uploading}
          aria-busy={isPending}
        >
          {isPending ? "Saving…" : submitLabel}
        </Button>
        <Link
          href="/admin/menu"
          className={buttonVariants({ variant: "outline", size: "default" })}
          onClick={(event) => {
            if (!confirmDiscard()) event.preventDefault();
          }}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
