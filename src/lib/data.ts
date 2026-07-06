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

// Single source of truth: Supabase when configured, otherwise sample data.
const useSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function fetchCategories(): Promise<Category[]> {
  if (useSupabase) {
    try {
      return await getSupabaseCategories();
    } catch {
      // fall through to sample data
    }
  }
  return sampleCategories;
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  if (useSupabase) {
    try {
      return await getSupabaseMenuItems();
    } catch {
      // fall through to sample data
    }
  }
  return sampleMenuItems;
}

export async function fetchCafeInfo(): Promise<CafeInfo> {
  if (useSupabase) {
    try {
      return await getSupabaseCafeInfo();
    } catch {
      // fall through to sample data
    }
  }
  return sampleCafeInfo;
}
