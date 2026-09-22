import { prisma } from "./prisma";
import { findNearbyListingIds } from "./geo";
import { DEFAULT_RADIUS_KM } from "./listings";

export type QueryListingsParams = {
  graduatingSoon?: boolean;
  near?: { lat: number; lng: number; radiusKm?: number };
  take?: number;
};

export async function queryListings(params: QueryListingsParams) {
  if (params.near) {
    const { lat, lng, radiusKm = DEFAULT_RADIUS_KM } = params.near;
    const nearby = await findNearbyListingIds(lat, lng, radiusKm * 1000);
    const ids = (params.take ? nearby.slice(0, params.take) : nearby).map((r) => r.id);

    if (ids.length === 0) return [];

    const distanceById = new Map(nearby.map((r) => [r.id, r.distance_m]));
    const rows = await prisma.listing.findMany({
      where: {
        id: { in: ids },
        ...(params.graduatingSoon ? { isGraduatingSoon: true } : {}),
      },
      include: { photos: true, seller: { select: { name: true } } },
    });
    const byId = new Map(rows.map((l) => [l.id, l]));

    return ids
      .map((id) => byId.get(id))
      .filter((l): l is NonNullable<typeof l> => l !== undefined)
      .map((l) => ({ ...l, distanceM: distanceById.get(l.id) ?? null }));
  }

  const rows = await prisma.listing.findMany({
    where: params.graduatingSoon ? { isGraduatingSoon: true } : undefined,
    include: { photos: true, seller: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: params.take,
  });

  return rows.map((l) => ({ ...l, distanceM: null as number | null }));
}
