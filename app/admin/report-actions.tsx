"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReportActions({
  reportId,
  targetType,
}: {
  reportId: string;
  targetType: "listing" | "user";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function setStatus(status: "actioned" | "dismissed") {
    setLoading(status);
    await fetch(`/api/admin/reports/${reportId}`, {
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
        onClick={() => setStatus("actioned")}
        disabled={loading !== null}
        className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        {loading === "actioned"
          ? "..."
          : targetType === "listing"
            ? "Action (hide listing)"
            : "Mark actioned"}
      </button>
      <button
        onClick={() => setStatus("dismissed")}
        disabled={loading !== null}
        className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
      >
        {loading === "dismissed" ? "..." : "Dismiss"}
      </button>
    </div>
  );
}
