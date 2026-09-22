export const CATEGORIES = ["furniture", "appliances", "textbooks", "electronics", "other"] as const;
export const CONDITIONS = ["new", "like_new", "good", "fair", "poor"] as const;

export type ListingInput = {
  title: string;
  description: string;
  price: number;
  category: (typeof CATEGORIES)[number];
  condition: (typeof CONDITIONS)[number];
  isGraduatingSoon: boolean;
  lat: number;
  lng: number;
  photoUrls: string[];
};

export function validateListingInput(body: unknown): ListingInput | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid listing payload" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.title !== "string" || b.title.trim().length === 0) {
    return { error: "Title is required" };
  }
  if (typeof b.description !== "string" || b.description.trim().length === 0) {
    return { error: "Description is required" };
  }
  if (typeof b.price !== "number" || !Number.isFinite(b.price) || b.price <= 0) {
    return { error: "Price must be a positive number" };
  }
  if (typeof b.category !== "string" || !CATEGORIES.includes(b.category as never)) {
    return { error: `Category must be one of: ${CATEGORIES.join(", ")}` };
  }
  if (typeof b.condition !== "string" || !CONDITIONS.includes(b.condition as never)) {
    return { error: `Condition must be one of: ${CONDITIONS.join(", ")}` };
  }
  if (typeof b.lat !== "number" || !Number.isFinite(b.lat) || b.lat < -90 || b.lat > 90) {
    return { error: "lat must be a number between -90 and 90" };
  }
  if (typeof b.lng !== "number" || !Number.isFinite(b.lng) || b.lng < -180 || b.lng > 180) {
    return { error: "lng must be a number between -180 and 180" };
  }
  const photoUrls = Array.isArray(b.photoUrls)
    ? b.photoUrls.filter((u): u is string => typeof u === "string")
    : [];

  return {
    title: b.title.trim(),
    description: b.description.trim(),
    price: b.price,
    category: b.category as (typeof CATEGORIES)[number],
    condition: b.condition as (typeof CONDITIONS)[number],
    isGraduatingSoon: b.isGraduatingSoon === true,
    lat: b.lat,
    lng: b.lng,
    photoUrls,
  };
}
