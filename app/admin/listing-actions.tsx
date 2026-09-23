"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ListingActions({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function setStatus(status: "approved" | "rejected") {
    setLoading(status);
    await fetch(`/api/admin/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setStatus("approved")}
        disabled={loading !== null}
        className="rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
      >
        {loading === "approved" ? "..." : "Approve"}
      </button>
      <button
        onClick={() => setStatus("rejected")}
        disabled={loading !== null}
        className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        {loading === "rejected" ? "..." : "Reject"}
      </button>
    </div>
  );
}
