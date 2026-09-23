import { runGeoBenchmark } from "@/lib/benchmark";
import { CAMPUS_NAME, CAMPUS_LAT, CAMPUS_LNG } from "@/lib/campus";
import { DEFAULT_RADIUS_KM } from "@/lib/listings";

// This page runs both queries fresh on every request — the numbers on
// screen are real measurements against the live database, not fixtures.
export const dynamic = "force-dynamic";

export default async function BenchmarkPage() {
  const {
    totalListings,
    timedRuns,
    indexedWallMs,
    indexedCount,
    explain,
    naiveWallMs,
    naiveCount,
    scannedCount,
    wronglyExcluded,
    wronglyIncluded,
  } = await runGeoBenchmark();

  const totalMismatches = wronglyExcluded.length + wronglyIncluded.length;
  const speedupX = naiveWallMs / indexedWallMs;

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Geospatial search benchmark</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Live comparison, run fresh on every load, of a proper indexed PostGIS
          radius query against the naive lat/lng distance filter most
          implementations start with. Reference point: {CAMPUS_NAME} ({CAMPUS_LAT},{" "}
          {CAMPUS_LNG}), radius {DEFAULT_RADIUS_KM}km, against{" "}
          {totalListings.toLocaleString()} seeded listings. Each timing below is the
          median of {timedRuns} runs after a warm-up pass, so connection setup and
          cold cache costs don&apos;t land on whichever query happens to run first.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="font-medium text-neutral-900">Indexed (ST_DWithin + GIST)</h2>
          <p className="text-3xl font-bold text-brand-700">{indexedWallMs.toFixed(1)} ms</p>
          <p className="text-sm text-neutral-600">
            {indexedCount.toLocaleString()} listings matched
          </p>
          <div className="mt-2 border-t border-neutral-100 pt-2 text-xs text-neutral-500">
            <p>Postgres execution time: {explain.executionTimeMs.toFixed(2)} ms</p>
            <p>
              Query plan:{" "}
              {explain.usedIndex ? (
                <span className="text-green-700">
                  ✓ Index Scan using &quot;{explain.indexName}&quot;
                </span>
              ) : (
                <span className="text-red-700">
                  ✗ no index used ({explain.nodeType})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="font-medium text-neutral-900">Naive in-app filter</h2>
          <p className="text-3xl font-bold text-neutral-500">{naiveWallMs.toFixed(1)} ms</p>
          <p className="text-sm text-neutral-600">
            {naiveCount.toLocaleString()} listings matched
          </p>
          <div className="mt-2 border-t border-neutral-100 pt-2 text-xs text-neutral-500">
            <p>Fetched all {scannedCount.toLocaleString()} rows, no spatial index</p>
            <p>Distance: unweighted lat/lng degree difference (no cos(lat) correction)</p>
          </div>
        </div>
      </section>

      <p className="text-sm text-neutral-600">
        {speedupX >= 1
          ? `The indexed query was ${speedupX.toFixed(1)}x faster.`
          : `At this dataset size the wall-clock gap is small (${speedupX.toFixed(
              2
            )}x) — the index's advantage grows as the table does; the correctness gap below does not depend on scale.`}
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">
          Correctness: {totalMismatches} listing{totalMismatches === 1 ? "" : "s"} wrong at
          the boundary
        </h2>
        {totalMismatches === 0 ? (
          <p className="text-sm text-neutral-600">
            No mismatches in this run — try again after seeding more data near the
            5km edge.
          </p>
        ) : (
          <>
            <p className="text-sm text-neutral-600">
              The naive filter ignores that a degree of longitude is physically
              smaller than a degree of latitude away from the equator, so it always
              overestimates east-west distance — it can only wrongly{" "}
              <strong>exclude</strong> listings that are genuinely in range, never
              wrongly include ones that aren&apos;t. Below are the closest-to-boundary
              cases, where that error actually flips the result.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-3 py-2">Listing</th>
                    <th className="px-3 py-2">True distance</th>
                    <th className="px-3 py-2">Naive distance</th>
                    <th className="px-3 py-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {wronglyExcluded.slice(0, 10).map((r) => (
                    <tr key={r.id} className="border-t border-neutral-100">
                      <td className="px-3 py-2 font-mono text-xs text-neutral-500">{r.id}</td>
                      <td className="px-3 py-2">{r.trueDistanceKm.toFixed(3)} km</td>
                      <td className="px-3 py-2">{r.naiveDistanceKm.toFixed(3)} km</td>
                      <td className="px-3 py-2 text-red-600">
                        wrongly excluded (should be in range)
                      </td>
                    </tr>
                  ))}
                  {wronglyIncluded.slice(0, 10).map((r) => (
                    <tr key={r.id} className="border-t border-neutral-100">
                      <td className="px-3 py-2 font-mono text-xs text-neutral-500">{r.id}</td>
                      <td className="px-3 py-2">—</td>
                      <td className="px-3 py-2">{r.naiveDistanceKm.toFixed(3)} km</td>
                      <td className="px-3 py-2 text-red-600">
                        wrongly included (outside {DEFAULT_RADIUS_KM}km)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-neutral-500">
              Showing up to 10 of each; {wronglyExcluded.length} wrongly excluded,{" "}
              {wronglyIncluded.length} wrongly included in this run.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
