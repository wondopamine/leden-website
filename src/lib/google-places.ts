// Google Places API integration for Cafe Le Den
// Fetches live rating + reviews when GOOGLE_PLACES_API_KEY is set,
// falls back to real reviews scraped from Google (Dec 2025).

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const SEARCH_QUERY = "Cafe Le Den 121 Donegani Pointe-Claire";
const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/place/Cafe+Le+Den/@45.4489,-73.8169,17z/";

export type GoogleReview = {
  name: string;
  rating: number;
  text: string;
  time: string;
  profilePhoto?: string;
};

export type PlaceData = {
  rating: number;
  reviewCount: number;
  reviews: GoogleReview[];
  url: string;
};

// ── Real Google reviews (verified Dec 2025 via Placejoys) ───────────
const FALLBACK_REVIEWS: GoogleReview[] = [
  {
    name: "Jin",
    rating: 5,
    text: "Cafe Le Den has become my go-to place in the neighborhood. The coffee is always freshly made, and the quality really stands out. What I also love is that the food is just as good — it's honestly rare to find a café that gets both right. The owner and staff are genuinely warm and welcoming.",
    time: "3 months ago",
  },
  {
    name: "Fi W",
    rating: 5,
    text: "We've been to this place on multiple occasions. The selections of sandwich are enormous, and they come with a small salad, and your choice of bread, offering great flexibility. Once, by mistake they forgot to include avocado, but they genuinely apologised and provided back the missing items. Compliment on their service and courtesy.",
    time: "3 months ago",
  },
  {
    name: "Lumia Lumia",
    rating: 5,
    text: "My first visit at this cafe. Wanted to relax with a coffee before dinner. A nice and young lady greeted me with a smile even if she was close to end her day. Took a muffin home and had a great Americano decaffeinated. Both were very good. Will be back.",
    time: "3 months ago",
  },
  {
    name: "Kate C",
    rating: 5,
    text: "I can honestly say this is one of the best cafés on the West Island. The coffee is great, the atmosphere is cozy, and the service is always friendly. Their vegan avocado sandwich is super tasty, fresh and I also loved the Earl Grey scone and the chicken panini.",
    time: "4 months ago",
  },
  {
    name: "Wondo Jeong",
    rating: 5,
    text: "As someone who lived in Turin for many years, I know good panini and coffee. This cafe made me write a review I rarely do. The Capo-stacked features very good-quality salami and mozzarella with a perfectly balanced profile. The iced Americano was also really good.",
    time: "4 months ago",
  },
  {
    name: "Marina Privorotsky",
    rating: 5,
    text: "Some of the best coffee in the West Island. Love their little cafe with lots of seating options, natural light, gentle indoor light, and plugs. Great working spot. Will definitely make this my regular go-to.",
    time: "4 months ago",
  },
  {
    name: "Vicky M",
    rating: 5,
    text: "What a cafe! I'm so glad I found this gem in the West. Jina and Josh were incredible, you walk in and are greeted with smiles right away. The matcha was SO TASTY and the sandwiches are perfect too. I was in awe of the atmosphere they created. 11/10.",
    time: "5 months ago",
  },
  {
    name: "Chett & Joyce",
    rating: 4,
    text: "A nice, quaint café in the neighborhood — perfect for catching up with friends or grabbing a quick lunch. We ordered the cream latte and the strawberry matcha latte. The coffee and matcha were both high quality. Great experience and appreciated the friendly service.",
    time: "5 months ago",
  },
];

const FALLBACK_DATA: PlaceData = {
  rating: 4.7,
  reviewCount: 252,
  reviews: FALLBACK_REVIEWS,
  url: GOOGLE_MAPS_URL,
};

// ── In-memory server-side cache ─────────────────────────────
let cachedData: PlaceData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function fetchFromGoogleAPI(): Promise<PlaceData | null> {
  if (!GOOGLE_API_KEY) return null;

  try {
    // Step 1: Find Place ID via text search
    const findRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?` +
        `input=${encodeURIComponent(SEARCH_QUERY)}` +
        `&inputtype=textquery` +
        `&fields=place_id` +
        `&key=${GOOGLE_API_KEY}`,
      { next: { revalidate: 86400 } }
    );
    const findData = await findRes.json();
    const placeId = findData.candidates?.[0]?.place_id;
    if (!placeId) return null;

    // Step 2: Fetch place details + reviews
    const detailRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${placeId}` +
        `&fields=rating,user_ratings_total,reviews,name,url` +
        `&reviews_sort=newest` +
        `&key=${GOOGLE_API_KEY}`,
      { next: { revalidate: 86400 } }
    );
    const detailData = await detailRes.json();
    const result = detailData.result;
    if (!result) return null;

    const apiReviews: GoogleReview[] = (result.reviews || []).map(
      (r: {
        author_name: string;
        rating: number;
        text: string;
        relative_time_description: string;
        profile_photo_url?: string;
      }) => ({
        name: r.author_name,
        rating: r.rating,
        text: r.text,
        time: r.relative_time_description,
        profilePhoto: r.profile_photo_url,
      })
    );

    // Google returns max 5 reviews — supplement with fallback for a fuller carousel
    const apiNames = new Set(apiReviews.map((r) => r.name));
    const extraReviews = FALLBACK_REVIEWS.filter(
      (fb) => !apiNames.has(fb.name)
    );
    const allReviews = [...apiReviews, ...extraReviews].slice(0, 10);

    return {
      rating: result.rating ?? FALLBACK_DATA.rating,
      reviewCount: result.user_ratings_total ?? FALLBACK_DATA.reviewCount,
      reviews: allReviews,
      url: result.url || GOOGLE_MAPS_URL,
    };
  } catch (err) {
    console.error("[google-places] API fetch failed:", err);
    return null;
  }
}

/**
 * Returns Google Place data (rating, review count, reviews).
 * Uses the live Google Places API when GOOGLE_PLACES_API_KEY is set,
 * otherwise returns real reviews collected from Google in Dec 2025.
 * Results are cached for 24 hours.
 */
export async function getGooglePlaceData(): Promise<PlaceData> {
  // Return cache if fresh
  if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedData;
  }

  // Try live Google API
  const liveData = await fetchFromGoogleAPI();
  if (liveData) {
    cachedData = liveData;
    cacheTimestamp = Date.now();
    return liveData;
  }

  // Fallback to real scraped data
  return FALLBACK_DATA;
}
