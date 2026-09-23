import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getListingForViewer } from "@/lib/listings-query";
import { DeleteButton } from "./delete-button";
import { ChatButton } from "./chat-button";
import { ReportButton } from "./report-button";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const listing = await getListingForViewer(id, session?.user?.id, session?.user?.isAdmin ?? false);

  if (!listing) {
    notFound();
  }

  const isOwner = session?.user?.id === listing.sellerId;

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <Link
        href="/listings"
        className="w-fit text-sm font-medium text-neutral-500 hover:text-brand-700"
      >
        ← Back to listings
      </Link>

      {listing.moderationStatus !== "approved" && isOwner && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {listing.moderationStatus === "pending"
            ? "This listing is pending review and isn't visible to other users yet."
            : `This listing was rejected and isn't visible to other users.${
                listing.moderationReason ? ` Reason: ${listing.moderationReason}` : ""
              }`}
        </div>
      )}

      {listing.photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {listing.photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.id}
              src={photo.url}
              alt={listing.title}
              className="aspect-square w-full rounded-xl object-cover shadow-sm"
            />
          ))}
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
          No photos
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        {listing.isGraduatingSoon && (
          <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            Graduating soon
          </span>
        )}
        <h1 className="text-2xl font-semibold text-neutral-900">{listing.title}</h1>
        <p className="text-2xl font-bold text-brand-700">₹{listing.price.toString()}</p>
        <p className="text-sm capitalize text-neutral-500">
          {listing.category} · {listing.condition.replace("_", " ")}
        </p>
        <p className="whitespace-pre-wrap text-neutral-700">{listing.description}</p>
        <p className="text-sm text-neutral-500">Listed by {listing.seller.name}</p>
      </div>

      {session?.user && !isOwner && (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <ChatButton listingId={listing.id} />
          <ReportButton targetType="listing" targetId={listing.id} />
        </div>
      )}

      {isOwner && (
        <div className="flex gap-2 border-t border-neutral-200 pt-4">
          <Link
            href={`/listings/${listing.id}/edit`}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Edit
          </Link>
          <DeleteButton listingId={listing.id} />
        </div>
      )}
    </main>
  );
}
