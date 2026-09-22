import "server-only";
import { prisma } from "./prisma";

export type NearbyRow = { id: string; distance_m: number };

/**
 * Indexed radius search: uses the GIST index on Listing.location via
 * ST_DWithin, ordered by true geodesic distance via ST_Distance.
 */
export async function findNearbyListingIds(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<NearbyRow[]> {
  return prisma.$queryRaw<NearbyRow[]>`
    SELECT id, ST_Distance(
      location,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    ) AS distance_m
    FROM "Listing"
    WHERE ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${radiusMeters}
    )
    ORDER BY distance_m ASC
  `;
}
