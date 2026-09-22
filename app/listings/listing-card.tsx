import Link from "next/link";

type ListingCardData = {
  id: string;
  title: string;
  price: string;
  category: string;
  condition: string;
  isGraduatingSoon: boolean;
  photos: { url: string }[];
  seller: { name: string };
  distanceM?: number | null;
};

export function ListingCard({ listing }: { listing: ListingCardData }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="flex flex-col overflow-hidden rounded border hover:shadow-sm"
    >
      <div className="flex aspect-square items-center justify-center bg-neutral-100 text-neutral-400">
        {listing.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.photos[0].url}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm">No photo</span>
        )}
      </div>
      <div className="flex flex-col gap-1 p-3">
        {listing.isGraduatingSoon && (
          <span className="w-fit rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Graduating soon
          </span>
        )}
        <span className="font-medium">{listing.title}</span>
        <span className="text-sm text-neutral-600">
          ₹{listing.price} · {listing.condition.replace("_", " ")}
        </span>
        <span className="text-xs text-neutral-500">by {listing.seller.name}</span>
        {listing.distanceM != null && (
          <span className="text-xs text-neutral-500">
            {(listing.distanceM / 1000).toFixed(1)} km away
          </span>
        )}
      </div>
    </Link>
  );
}
