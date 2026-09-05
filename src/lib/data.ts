import {
  getCategories as getSupabaseCategories,
  getMenuItems as getSupabaseMenuItems,
  getCafeInfo as getSupabaseCafeInfo,
} from "./supabase/queries";
import {
  sampleCategories,
  sampleMenuItems,
  sampleCafeInfo,
} from "./sample-data";
import type { MenuItem, Category, CafeInfo } from "./types";

export class StorefrontDataUnavailableError extends Error {
  constructor() {
    super("Authoritative storefront data is unavailable.");
    this.name = "StorefrontDataUnavailableError";
  }
}

type StorefrontDataSource = "supabase" | "sample" | "unavailable";

export function resolveStorefrontDataSource(
  environment: Partial<NodeJS.ProcessEnv> = process.env,
): StorefrontDataSource {
  if (
    environment.NEXT_PUBLIC_SUPABASE_URL ||
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return "supabase";
  }
  if (
    environment.NODE_ENV === "development" ||
    environment.PLAYWRIGHT_STOREFRONT_PREVIEW === "1"
  ) {
    return "sample";
  }
  return "unavailable";
}

function requireSampleData() {
  if (resolveStorefrontDataSource() !== "sample") {
    throw new StorefrontDataUnavailableError();
  }
}

export async function fetchCategories(): Promise<Category[]> {
  if (resolveStorefrontDataSource() === "supabase") {
    return getSupabaseCategories();
  }
  requireSampleData();
  return sampleCategories;
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  if (resolveStorefrontDataSource() === "supabase") {
    return getSupabaseMenuItems();
  }
  requireSampleData();
  return sampleMenuItems;
}

export async function fetchCafeInfo(): Promise<CafeInfo> {
  if (resolveStorefrontDataSource() === "supabase") {
    return getSupabaseCafeInfo();
  }
  requireSampleData();
  return sampleCafeInfo;
}
