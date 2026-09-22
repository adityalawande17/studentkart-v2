import Link from "next/link";
import { auth } from "@/auth";
import { queryListings } from "@/lib/listings-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/listings";
import { ListingCard } from "./listing-card";
import { SignOutButton } from "./sign-out-button";
import { NearMeButton } from "./near-me-button";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ graduatingSoon?: string; lat?: string; lng?: string; radiusKm?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const showGraduatingOnly = sp.graduatingSoon === "true";

  const lat = sp.lat ? Number(sp.lat) : undefined;
  const lng = sp.lng ? Number(sp.lng) : undefined;
  const radiusKm = sp.radiusKm ? Number(sp.radiusKm) : undefined;
  const nearActive = lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng);

  const near = nearActive ? { lat: lat!, lng: lng!, radiusKm } : undefined;

  const [graduatingListings, listings] = await Promise.all([
    showGraduatingOnly
      ? Promise.resolve([])
      : queryListings({ graduatingSoon: true, near, take: 8 }),
    queryListings({ graduatingSoon: showGraduatingOnly, near, take: DEFAULT_PAGE_SIZE }),
  ]);

  return (
    <main className="mx-auto flex max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Listings</h1>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          {session?.user ? (
            <>
              <span>
                Signed in as {session.user.email} ({session.user.role})
              </span>
              <Link href="/listings/new" className="rounded bg-black px-3 py-1.5 text-white">
                New listing
              </Link>
              <Link href="/listings/new-bulk" className="underline">
                Moving out? List everything
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link href="/login" className="underline">
              Log in to sell
            </Link>
          )}
        </div>
      </div>

      {graduatingListings.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-amber-800">
              🎓 Graduating soon — grab it before it&apos;s gone
            </h2>
            <Link href="/listings?graduatingSoon=true" className="text-sm underline">
              See all
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {graduatingListings.map((listing) => (
              <div key={listing.id} className="w-48 shrink-0">
                <ListingCard
                  listing={{ ...listing, price: listing.price.toString() }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/listings"
            className={`rounded-full px-3 py-1 ${
              !showGraduatingOnly ? "bg-black text-white" : "border"
            }`}
          >
            All listings
          </Link>
          <Link
            href="/listings?graduatingSoon=true"
            className={`rounded-full px-3 py-1 ${
              showGraduatingOnly ? "bg-black text-white" : "border"
            }`}
          >
            Graduating soon
          </Link>
          <NearMeButton active={nearActive} />
        </div>

        {listings.length === 0 ? (
          <div className="rounded border border-dashed p-12 text-center text-neutral-500">
            {nearActive ? "No listings within 5km yet." : "No listings yet."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={{ ...listing, price: listing.price.toString() }}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
