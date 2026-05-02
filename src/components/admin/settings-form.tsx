"use client";

import { useState, useTransition } from "react";
import { updateCafeInfo } from "@/app/admin/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

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

  function updateHour(
    idx: number,
    field: keyof HourEntry,
    value: string | boolean
  ) {
    const updated = [...hours];
    (updated[idx] as Record<string, string | boolean>)[field] = value;
    setHours(updated);
  }

  function handleSave() {
    if (!initialData?.id) return;
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
        toast.success("Settings saved");
      } catch {
        toast.error("Failed to save settings");
      }
    });
  }

  if (!initialData) {
    return (
      <p className="text-stone-500">
        No cafe info found. Please run the seed migration.
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Business Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {hours.map((h, idx) => (
            <div key={h.day} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium">{h.day}</span>
              <Switch
                checked={!h.closed}
                onCheckedChange={(open) => updateHour(idx, "closed", !open)}
              />
              {!h.closed ? (
                <>
                  <Input
                    type="time"
                    value={h.open}
                    onChange={(e) => updateHour(idx, "open", e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-stone-400">to</span>
                  <Input
                    type="time"
                    value={h.close}
                    onChange={(e) => updateHour(idx, "close", e.target.value)}
                    className="w-32"
                  />
                </>
              ) : (
                <span className="text-sm text-stone-400">Closed</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Announcement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>English</Label>
            <Textarea
              value={announcementEn}
              onChange={(e) => setAnnouncementEn(e.target.value)}
              rows={2}
              placeholder="Optional announcement displayed on the website"
            />
          </div>
          <div className="space-y-2">
            <Label>French</Label>
            <Textarea
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
          <CardTitle className="text-sm">Order Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Pickup Lead Time (minutes)</Label>
            <Input
              type="number"
              min="5"
              value={pickupLeadTime}
              onChange={(e) =>
                setPickupLeadTime(parseInt(e.target.value) || 15)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Max Advance Order Days</Label>
            <Input
              type="number"
              min="0"
              value={maxAdvanceDays}
              onChange={(e) =>
                setMaxAdvanceDays(parseInt(e.target.value) || 3)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Button variant="default" size="default" onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
