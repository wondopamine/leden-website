"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateCafeInfo } from "@/app/admin/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";

type HourEntry = {
  day: string;
  open: string;
  close: string;
  closed: boolean;
};

type CafeInfoData = {
  id: string;
  hours: HourEntry[];
  address: string;
  phone: string;
  announcement_en: string | null;
  announcement_fr: string | null;
  pickup_lead_time: number;
  max_advance_order_days: number;
};

type Props = {
  initialData: CafeInfoData | null;
};

export function SettingsForm({ initialData }: Props) {
  const [isPending, startTransition] = useTransition();
  const [hours, setHours] = useState<HourEntry[]>(
    initialData?.hours ?? []
  );
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [announcementEn, setAnnouncementEn] = useState(
    initialData?.announcement_en ?? ""
  );
  const [announcementFr, setAnnouncementFr] = useState(
    initialData?.announcement_fr ?? ""
  );
  const [pickupLeadTime, setPickupLeadTime] = useState(
    initialData?.pickup_lead_time ?? 15
  );
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(
    initialData?.max_advance_order_days ?? 3
  );
  const [isDirty, setIsDirty] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const { confirmDiscard, suspendProtection, resumeProtection } =
    useUnsavedChanges(isDirty, () => setIsDirty(false));

  function updateHour(
    idx: number,
    field: keyof HourEntry,
    value: string | boolean
  ) {
    setIsDirty(true);
    const updated = [...hours];
    (updated[idx] as Record<string, string | boolean>)[field] = value;
    setHours(updated);
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!initialData?.id) return;
    setSubmissionMessage(null);
    suspendProtection();
    setIsDirty(false);
    startTransition(async () => {
      try {
        await updateCafeInfo({
          id: initialData.id,
          hours,
          address,
          phone,
          announcement_en: announcementEn,
          announcement_fr: announcementFr,
          pickup_lead_time: pickupLeadTime,
          max_advance_order_days: maxAdvanceDays,
        });
        setIsDirty(false);
        setSubmissionMessage({ tone: "success", text: "Settings saved." });
      } catch {
        resumeProtection();
        setIsDirty(true);
        setSubmissionMessage({
          tone: "error",
          text: "Settings were not saved. Check the fields and your connection, then try again.",
        });
      }
    });
  }

  if (!initialData) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-sans text-sm font-semibold text-foreground">
          Settings unavailable
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No café information was found. Run the seed migration, then reload this
          page.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      onChange={() => setIsDirty(true)}
      aria-busy={isPending}
      className="max-w-2xl space-y-4"
    >
      {/* Hours */}
      <Card>
        <CardHeader>
          <CardTitle as="h2" className="font-sans text-sm font-semibold">
            Business hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {hours.map((h, idx) => (
            <div
              key={h.day}
              className="grid gap-2 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[6rem_auto_1fr] sm:items-center"
            >
              <span className="text-sm font-medium text-foreground">
                {h.day}
              </span>
              <div className="flex min-h-11 items-center gap-2 sm:min-h-9">
                <Switch
                  id={`hours-${idx}-open`}
                  checked={!h.closed}
                  onCheckedChange={(open) => updateHour(idx, "closed", !open)}
                  aria-label={`${h.day} is open`}
                />
                <Label htmlFor={`hours-${idx}-open`} className="font-normal">
                  {h.closed ? "Closed" : "Open"}
                </Label>
              </div>
              {!h.closed ? (
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`hours-${idx}-start`}>Opens</Label>
                    <Input
                      id={`hours-${idx}-start`}
                      type="time"
                      value={h.open}
                      onChange={(e) => updateHour(idx, "open", e.target.value)}
                      className="tabular-nums"
                    />
                  </div>
                  <span className="pb-3 text-sm text-muted-foreground sm:pb-2">
                    to
                  </span>
                  <div className="space-y-1.5">
                    <Label htmlFor={`hours-${idx}-end`}>Closes</Label>
                    <Input
                      id={`hours-${idx}-end`}
                      type="time"
                      value={h.close}
                      onChange={(e) => updateHour(idx, "close", e.target.value)}
                      className="tabular-nums"
                    />
                  </div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  No pickup hours
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle as="h2" className="font-sans text-sm font-semibold">
            Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cafe-address">Address</Label>
            <Input
              id="cafe-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cafe-phone">Phone</Label>
            <Input
              id="cafe-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Announcement */}
      <Card>
        <CardHeader>
          <CardTitle as="h2" className="font-sans text-sm font-semibold">
            Announcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="announcement-en">English</Label>
            <Textarea
              id="announcement-en"
              value={announcementEn}
              onChange={(e) => setAnnouncementEn(e.target.value)}
              rows={2}
              placeholder="Optional announcement displayed on the website"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-fr">French</Label>
            <Textarea
              id="announcement-fr"
              value={announcementFr}
              onChange={(e) => setAnnouncementFr(e.target.value)}
              rows={2}
              placeholder="Annonce optionnelle affichée sur le site"
            />
          </div>
        </CardContent>
      </Card>

      {/* Order settings */}
      <Card>
        <CardHeader>
          <CardTitle as="h2" className="font-sans text-sm font-semibold">
            Order settings
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pickup-lead-time">Pickup lead time (minutes)</Label>
            <Input
              id="pickup-lead-time"
              type="number"
              min="5"
              value={pickupLeadTime}
              onChange={(e) =>
                setPickupLeadTime(parseInt(e.target.value) || 15)
              }
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-advance-days">Maximum advance order days</Label>
            <Input
              id="max-advance-days"
              type="number"
              min="0"
              value={maxAdvanceDays}
              onChange={(e) =>
                setMaxAdvanceDays(parseInt(e.target.value) || 3)
              }
              className="tabular-nums"
            />
          </div>
        </CardContent>
      </Card>

      {isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Saving settings…
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
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? "Saving…" : "Save settings"}
        </Button>
        <Link
          href="/admin"
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
