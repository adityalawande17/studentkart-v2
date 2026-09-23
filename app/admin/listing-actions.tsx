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
        className="rounded bg-green-700 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        {loading === "approved" ? "..." : "Approve"}
      </button>
      <button
        onClick={() => setStatus("rejected")}
        disabled={loading !== null}
        className="rounded bg-red-700 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        {loading === "rejected" ? "..." : "Reject"}
      </button>
    </div>
  );
}
