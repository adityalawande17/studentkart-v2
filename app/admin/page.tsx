import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ReportActions } from "./report-actions";
import { ListingActions } from "./listing-actions";

export default async function AdminPage() {
  const session = await requireAdminSession();
  if (!session) {
    notFound();
  }

  const [reports, pendingListings] = await Promise.all([
    prisma.report.findMany({
      where: { status: "open" },
      include: { reporter: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.listing.findMany({
      where: { moderationStatus: "pending" },
      include: { seller: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-4xl flex-1 flex-col gap-10 px-4 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Moderation</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">
          Open reports{" "}
          <span className="text-sm font-normal text-neutral-500">({reports.length})</span>
        </h2>
        {reports.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            No open reports.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1 text-sm">
                  <span>
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                      {r.targetType}
                    </span>{" "}
                    {r.targetType === "listing" ? (
                      <Link
                        href={`/listings/${r.targetId}`}
                        className="break-all font-medium text-brand-700 hover:underline"
                      >
                        {r.targetId}
                      </Link>
                    ) : (
                      <span className="break-all">{r.targetId}</span>
                    )}
                  </span>
                  <span className="text-neutral-700">{r.reason}</span>
                  <span className="text-xs text-neutral-400">
                    reported by {r.reporter.name} ({r.reporter.email})
                  </span>
                </div>
                <div className="shrink-0">
                  <ReportActions reportId={r.id} targetType={r.targetType} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">
          Pending listings{" "}
          <span className="text-sm font-normal text-neutral-500">
            ({pendingListings.length})
          </span>
        </h2>
        {pendingListings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            No listings pending review.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {pendingListings.map((l) => (
              <div
                key={l.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1 text-sm">
                  <Link
                    href={`/listings/${l.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {l.title}
                  </Link>
                  <span className="font-semibold text-neutral-900">₹{l.price.toString()}</span>
                  {l.moderationReason && (
                    <span className="w-fit rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Flagged: {l.moderationReason}
                    </span>
                  )}
                  <span className="text-xs text-neutral-400">
                    by {l.seller.name} ({l.seller.email})
                  </span>
                </div>
                <div className="shrink-0">
                  <ListingActions listingId={l.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
