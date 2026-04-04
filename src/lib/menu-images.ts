// Category-level fallback images when no photo is uploaded
const categoryImages: Record<string, string> = {
  coffee:    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop&q=80",
  tea:       "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&h=300&fit=crop&q=80",
  breakfast: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop&q=80",
  lunch:     "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop&q=80",
  pastries:  "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=400&h=300&fit=crop&q=80",
};

export function getItemImageUrl(item: {
  _id: string;
  category: { slug: string };
  image?: { asset: { _ref: string } };
}): string {
  if (item.image?.asset?._ref?.startsWith("http")) return item.image.asset._ref;
  return categoryImages[item.category.slug] || categoryImages.coffee;
}
