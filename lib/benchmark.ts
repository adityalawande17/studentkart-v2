import "server-only";
import { prisma } from "./prisma";
import { findNearbyListingIds, naiveDistanceKm, explainNearbyQuery, type NearbyRow } from "./geo";
import { CAMPUS_LAT, CAMPUS_LNG } from "./campus";
import { DEFAULT_RADIUS_KM } from "./listings";

const TIMED_RUNS = 3;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

type NaiveRow = { id: string; distanceKm: number };

async function runNaive(allListings: { id: string; lat: number; lng: number }[]): Promise<NaiveRow[]> {
  return allListings
    .map((l) => ({ id: l.id, distanceKm: naiveDistanceKm(CAMPUS_LAT, CAMPUS_LNG, l.lat, l.lng) }))
    .filter((r) => r.distanceKm <= DEFAULT_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// Not a component — the timing calls here are the actual measurement,
// deliberately impure, and live outside React's render tree.
//
// Both approaches are timed as `TIMED_RUNS` repetitions after a warm-up
// pass, reporting the median. A single sample against a remote database
// is dominated by whichever query happens to pay the connection/cache
// warm-up cost, which makes a one-shot comparison misleading.
export async function runGeoBenchmark() {
  const radiusMeters = DEFAULT_RADIUS_KM * 1000;

  const totalListings = await prisma.listing.count();

  // Warm-up: touch both code paths once, untimed, so neither measured
  // run below pays connection setup / cold buffer-cache cost.
  await findNearbyListingIds(CAMPUS_LAT, CAMPUS_LNG, radiusMeters);
  const warmupAll = await prisma.listing.findMany({ select: { id: true, lat: true, lng: true } });
  await runNaive(warmupAll);

  const indexedTimes: number[] = [];
  let indexedResults: NearbyRow[] = [];
  for (let i = 0; i < TIMED_RUNS; i++) {
    const start = performance.now();
    indexedResults = await findNearbyListingIds(CAMPUS_LAT, CAMPUS_LNG, radiusMeters);
    indexedTimes.push(performance.now() - start);
  }

  const explain = await explainNearbyQuery(CAMPUS_LAT, CAMPUS_LNG, radiusMeters);

  const naiveTimes: number[] = [];
  let naiveResults: NaiveRow[] = [];
  let allListings = warmupAll;
  for (let i = 0; i < TIMED_RUNS; i++) {
    const start = performance.now();
    allListings = await prisma.listing.findMany({ select: { id: true, lat: true, lng: true } });
    naiveResults = await runNaive(allListings);
    naiveTimes.push(performance.now() - start);
  }

  const indexedWallMs = median(indexedTimes);
  const naiveWallMs = median(naiveTimes);

  const listingById = new Map(allListings.map((l) => [l.id, l]));
  const indexedIds = new Set(indexedResults.map((r) => r.id));
  const naiveIds = new Set(naiveResults.map((r) => r.id));

  const wronglyExcluded = indexedResults
    .filter((r) => !naiveIds.has(r.id))
    .map((r) => {
      const l = listingById.get(r.id)!;
      return {
        id: r.id,
        trueDistanceKm: r.distance_m / 1000,
        naiveDistanceKm: naiveDistanceKm(CAMPUS_LAT, CAMPUS_LNG, l.lat, l.lng),
      };
    })
    .sort((a, b) => b.trueDistanceKm - a.trueDistanceKm);

  const wronglyIncluded = naiveResults
    .filter((r) => !indexedIds.has(r.id))
    .map((r) => ({ id: r.id, naiveDistanceKm: r.distanceKm }));

  return {
    totalListings,
    radiusMeters,
    timedRuns: TIMED_RUNS,
    indexedWallMs,
    indexedTimes,
    indexedCount: indexedResults.length,
    explain,
    naiveWallMs,
    naiveTimes,
    naiveCount: naiveResults.length,
    scannedCount: allListings.length,
    wronglyExcluded,
    wronglyIncluded,
  };
}
