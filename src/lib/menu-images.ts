// Placeholder food images for menu items
// Replace these with actual Cafe Le Den photos from Instagram/uploads
// Images sourced from Paris Baguette SG and Unsplash as temporary placeholders

// Per-item image mapping (by item _id)
export const menuItemImages: Record<string, string> = {
  "item-1":  "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop&q=80", // Pistachio Latte
  "item-2":  "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&h=400&fit=crop&q=80", // Ube Matcha Latte
  "item-3":  "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop&q=80", // Peanut Latte
  "item-4":  "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=400&h=400&fit=crop&q=80", // Strawberry Matcha Latte
  "item-5":  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop&q=80", // Classic Latte
  "item-6":  "https://images.unsplash.com/photo-1608039829572-9b1234ef0d0d?w=400&h=400&fit=crop&q=80", // Eggs Benedict
  "item-7":  "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&h=400&fit=crop&q=80", // Avocado Toast
  "item-8":  "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=400&fit=crop&q=80", // Hot & Sour Soup
  "item-9":  "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop&q=80", // Wonton Soup
  "item-10": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=400&fit=crop&q=80", // Grilled Chicken Sandwich
  "item-11": "https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=400&h=400&fit=crop&q=80", // Butter Croissant
  "item-12": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=400&fit=crop&q=80", // Chocolate Brownie
};

// Category-level fallback images
export const categoryImages: Record<string, string> = {
  coffee:    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop&q=80",
  tea:       "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&h=300&fit=crop&q=80",
  breakfast: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop&q=80",
  lunch:     "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop&q=80",
  pastries:  "https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=400&h=300&fit=crop&q=80",
};

export function getMenuItemImage(itemId: string, categorySlug: string): string {
  return menuItemImages[itemId] || categoryImages[categorySlug] || categoryImages.coffee;
}

export function getItemImageUrl(item: {
  _id: string;
  category: { slug: string };
  image?: { asset: { _ref: string } };
}): string {
  if (item.image?.asset?._ref?.startsWith("http")) return item.image.asset._ref;
  return getMenuItemImage(item._id, item.category.slug);
}
