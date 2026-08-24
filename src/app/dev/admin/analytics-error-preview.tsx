"use client";

import { useCallback } from "react";
import {
  AnalyticsDashboard,
  type AnalyticsLoader,
} from "@/components/admin/analytics-dashboard";
import type { AnalyticsData } from "@/lib/supabase/analytics";

const RECOVERED_ANALYTICS: AnalyticsData = {
  totalOrders: 42,
  totalRevenue: 486.5,
  avgOrderValue: 11.58,
  cancelledRate: 4.8,
  revenueTrend: [
    { label: "08", revenue: 42, orders: 4 },
    { label: "09", revenue: 88.5, orders: 8 },
    { label: "10", revenue: 121, orders: 10 },
  ],
  topItems: [
    { name: "Flat White", quantity: 18, revenue: 90 },
    { name: "Almond Croissant", quantity: 12, revenue: 60 },
  ],
  statusBreakdown: [],
  peakHours: [
    { hour: "08:00", orders: 4 },
    { hour: "09:00", orders: 8 },
    { hour: "10:00", orders: 10 },
  ],
};

export function AnalyticsErrorPreview() {
  const loadAnalytics = useCallback<AnalyticsLoader>(
    async (_period, retryAttempt) => {
      await new Promise((resolve) => window.setTimeout(resolve, 200));
      if (retryAttempt === 0) {
        throw new Error("Deterministic preview failure");
      }
      return RECOVERED_ANALYTICS;
    },
    [],
  );

  return <AnalyticsDashboard loadAnalytics={loadAnalytics} />;
}
