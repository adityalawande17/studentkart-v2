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
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-neutral-100 text-neutral-400">
        {listing.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.photos[0].url}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
          />
        ) : (
          <span className="text-sm">No photo</span>
        )}
        {listing.isGraduatingSoon && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950 shadow-sm">
            Graduating soon
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="truncate font-medium text-neutral-900">{listing.title}</span>
        <span className="font-semibold text-brand-700">
          ₹{listing.price}
          <span className="ml-1.5 text-xs font-normal text-neutral-500">
            {listing.condition.replace("_", " ")}
          </span>
        </span>
        <div className="mt-auto flex items-center justify-between pt-1 text-xs text-neutral-500">
          <span className="truncate">by {listing.seller.name}</span>
          {listing.distanceM != null && (
            <span className="shrink-0 font-medium text-neutral-600">
              {(listing.distanceM / 1000).toFixed(1)} km
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
