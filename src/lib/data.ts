import {
  getCategories as getSupabaseCategories,
  getMenuItems as getSupabaseMenuItems,
  getCafeInfo as getSupabaseCafeInfo,
} from "./supabase/queries";
import {
  getCategories as getSanityCategories,
  getMenuItems as getSanityMenuItems,
  getCafeInfo as getSanityCafeInfo,
} from "./sanity/queries";
import {
  sampleCategories,
  sampleMenuItems,
  sampleCafeInfo,
} from "./sample-data";
import type { MenuItem, Category, CafeInfo } from "./sanity/types";

const useSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const useSanity = !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;

export async function fetchCategories(): Promise<Category[]> {
  if (useSupabase) {
    try {
      return await getSupabaseCategories();
    } catch {
      // fall through
    }
  }
  if (useSanity) {
    try {
      return await getSanityCategories();
    } catch {
      // fall through
    }
  }
  return sampleCategories;
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  if (useSupabase) {
    try {
      return await getSupabaseMenuItems();
    } catch {
      // fall through
    }
  }
  if (useSanity) {
    try {
      const items = await getSanityMenuItems();
      return items.map((item) => ({
        ...item,
        status: item.status ?? (item.available ? "available" : "hidden"),
      }));
    } catch {
      // fall through
    }
  }
  return sampleMenuItems;
}

export async function fetchCafeInfo(): Promise<CafeInfo> {
  if (useSupabase) {
    try {
      return await getSupabaseCafeInfo();
    } catch {
      // fall through
    }
  }
  if (useSanity) {
    try {
      return await getSanityCafeInfo();
    } catch {
      // fall through
    }
  }
  return sampleCafeInfo;
}
