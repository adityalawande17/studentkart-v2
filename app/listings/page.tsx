import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "./listing-card";
import { SignOutButton } from "./sign-out-button";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ graduatingSoon?: string }>;
}) {
  const session = await auth();
  const { graduatingSoon } = await searchParams;
  const showGraduatingOnly = graduatingSoon === "true";

  const [graduatingListings, listings] = await Promise.all([
    showGraduatingOnly
      ? Promise.resolve([])
      : prisma.listing.findMany({
          where: { isGraduatingSoon: true },
          include: { photos: true, seller: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
    prisma.listing.findMany({
      where: showGraduatingOnly ? { isGraduatingSoon: true } : undefined,
      include: { photos: true, seller: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
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
        <div className="flex items-center gap-2 text-sm">
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
        </div>

        {listings.length === 0 ? (
          <div className="rounded border border-dashed p-12 text-center text-neutral-500">
            No listings yet.
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
