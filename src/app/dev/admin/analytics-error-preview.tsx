"use client";

import { AnalyticsErrorState } from "@/components/admin/analytics-dashboard";

export function AnalyticsErrorPreview() {
  return (
    <AnalyticsErrorState
      message="Order analysis could not be loaded. Check your connection and try again."
      onRetry={() => undefined}
    />
  );
}
