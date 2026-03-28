import { unstable_cache } from "next/cache";
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

async function _fetchCategories(): Promise<Category[]> {
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

async function _fetchMenuItems(): Promise<MenuItem[]> {
  if (useSupabase) {
    try {
      return await getSupabaseMenuItems();
    } catch {
      // fall through
    }
  }
  if (useSanity) {
    try {
      return await getSanityMenuItems();
    } catch {
      // fall through
    }
  }
  return sampleMenuItems;
}

async function _fetchCafeInfo(): Promise<CafeInfo> {
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

// Cache for 5 minutes — menu/categories/cafe info rarely change
export const fetchCategories = unstable_cache(
  _fetchCategories,
  ["categories"],
  { revalidate: 300, tags: ["categories"] }
);

export const fetchMenuItems = unstable_cache(
  _fetchMenuItems,
  ["menu-items"],
  { revalidate: 300, tags: ["menu-items"] }
);

export const fetchCafeInfo = unstable_cache(
  _fetchCafeInfo,
  ["cafe-info"],
  { revalidate: 300, tags: ["cafe-info"] }
);
