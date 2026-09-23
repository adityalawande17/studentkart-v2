"use client";

import { useState } from "react";

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "listing" | "user";
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    setDone(true);
  }

  if (done) {
    return <span className="text-sm text-neutral-500">Reported. Thanks for flagging this.</span>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-red-700 underline"
      >
        Report
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded border p-3 text-sm">
      <textarea
        className="rounded border px-2 py-1"
        placeholder="Why are you reporting this?"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        required
      />
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-red-700 px-3 py-1 text-white disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit report"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border px-3 py-1">
          Cancel
        </button>
      </div>
    </form>
  );
}
