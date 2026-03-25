import { getCategories, getMenuItems, getCafeInfo } from "./sanity/queries";
import { sampleCategories, sampleMenuItems, sampleCafeInfo } from "./sample-data";
import type { MenuItem, Category, CafeInfo } from "./sanity/types";

const useSanity = !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;

export async function fetchCategories(): Promise<Category[]> {
  if (!useSanity) return sampleCategories;
  try {
    return await getCategories();
  } catch {
    return sampleCategories;
  }
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  if (!useSanity) return sampleMenuItems;
  try {
    return await getMenuItems();
  } catch {
    return sampleMenuItems;
  }
}

export async function fetchCafeInfo(): Promise<CafeInfo> {
  if (!useSanity) return sampleCafeInfo;
  try {
    return await getCafeInfo();
  } catch {
    return sampleCafeInfo;
  }
}
