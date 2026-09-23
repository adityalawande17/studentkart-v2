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
    <div className="w-full min-w-0 flex-1">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/listings" className="text-lg font-bold tracking-tight text-neutral-900">
            Student<span className="text-brand-600">Kart</span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-600">
            {session?.user ? (
              <>
                <span className="hidden text-neutral-500 sm:inline">
                  {session.user.email} ({session.user.role})
                </span>
                <Link
                  href="/listings/new"
                  className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white transition hover:bg-brand-700"
                >
                  New listing
                </Link>
                <Link href="/listings/new-bulk" className="font-medium hover:text-brand-700">
                  Moving out?
                </Link>
                <Link href="/chat" className="font-medium hover:text-brand-700">
                  Chats
                </Link>
                <SignOutButton />
              </>
            ) : (
              <Link href="/login" className="font-medium hover:text-brand-700">
                Log in to sell
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-8 px-4 py-8">
        {graduatingListings.length > 0 && (
          <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-amber-900">
                Graduating soon — grab it before it&apos;s gone
              </h2>
              <Link
                href="/listings?graduatingSoon=true"
                className="shrink-0 text-sm font-medium text-amber-800 hover:underline"
              >
                See all →
              </Link>
            </div>
            <div className="flex min-w-0 gap-4 overflow-x-auto pb-2">
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

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/listings"
              className={`rounded-full px-3 py-1.5 font-medium transition ${
                !showGraduatingOnly
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              All listings
            </Link>
            <Link
              href="/listings?graduatingSoon=true"
              className={`rounded-full px-3 py-1.5 font-medium transition ${
                showGraduatingOnly
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              Graduating soon
            </Link>
            <NearMeButton active={nearActive} />
          </div>

          {listings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center text-neutral-500">
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
    </div>
  );
}
