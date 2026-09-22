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

/**
 * Deliberately naive "as most people first write it" distance: treats a
 * degree of longitude as the same physical size as a degree of latitude,
 * ignoring that longitude degrees shrink by cos(latitude). This is the
 * classic bolted-on lat/lng mistake — it always overestimates east-west
 * distance, so it can only wrongly EXCLUDE listings that are genuinely
 * within radius, never wrongly include ones that aren't.
 */
export function naiveDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const KM_PER_DEGREE = 111.32;
  const dLat = (lat2 - lat1) * KM_PER_DEGREE;
  const dLng = (lng2 - lng1) * KM_PER_DEGREE;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export type PlanNode = {
  "Node Type"?: string;
  "Index Name"?: string;
  Plans?: PlanNode[];
  [key: string]: unknown;
};

function findIndexScan(node: PlanNode): PlanNode | null {
  if (node["Index Name"]) return node;
  for (const child of node.Plans ?? []) {
    const found = findIndexScan(child);
    if (found) return found;
  }
  return null;
}

/**
 * Runs EXPLAIN ANALYZE on the same indexed query so we can show Postgres's
 * own execution time and confirm it actually used the GIST index, rather
 * than just trusting our own wall-clock measurement.
 */
export async function explainNearbyQuery(lat: number, lng: number, radiusMeters: number) {
  const rows = await prisma.$queryRaw<{ "QUERY PLAN": [{ Plan: PlanNode; "Execution Time": number }] }[]>`
    EXPLAIN (ANALYZE, FORMAT JSON)
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

  const plan = rows[0]["QUERY PLAN"][0];
  const indexScan = findIndexScan(plan.Plan);

  return {
    executionTimeMs: plan["Execution Time"],
    usedIndex: indexScan !== null,
    indexName: indexScan?.["Index Name"] ?? null,
    nodeType: indexScan?.["Node Type"] ?? plan.Plan["Node Type"] ?? null,
  };
}
