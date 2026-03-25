import { getClient } from "./client";
import type { MenuItem, Category, CafeInfo } from "./types";

export async function getCategories(): Promise<Category[]> {
  return getClient().fetch(
    `*[_type == "category"] | order(order asc) {
      _id,
      name,
      "slug": slug.current,
      order
    }`
  );
}

export async function getMenuItems(): Promise<MenuItem[]> {
  return getClient().fetch(
    `*[_type == "menuItem"] {
      _id,
      name,
      description,
      price,
      category->{
        _id,
        name,
        "slug": slug.current
      },
      image,
      available,
      modifiers
    }`
  );
}

export async function getMenuItemsByCategory(
  categorySlug: string
): Promise<MenuItem[]> {
  return getClient().fetch(
    `*[_type == "menuItem" && category->slug.current == $slug] {
      _id,
      name,
      description,
      price,
      category->{
        _id,
        name,
        "slug": slug.current
      },
      image,
      available,
      modifiers
    }`,
    { slug: categorySlug }
  );
}

export async function getCafeInfo(): Promise<CafeInfo> {
  return getClient().fetch(
    `*[_type == "cafeInfo"][0] {
      hours,
      address,
      phone,
      announcement,
      pickupLeadTime,
      maxAdvanceOrderDays
    }`
  );
}
