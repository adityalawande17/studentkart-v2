"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DealConfirmation({
  conversationId,
  otherUserName,
  initialMyConfirmed,
  initialOtherConfirmed,
  initialDealConfirmed,
  initialAlreadyReviewed,
}: {
  conversationId: string;
  otherUserName: string;
  initialMyConfirmed: boolean;
  initialOtherConfirmed: boolean;
  initialDealConfirmed: boolean;
  initialAlreadyReviewed: boolean;
}) {
  const router = useRouter();
  const [myConfirmed, setMyConfirmed] = useState(initialMyConfirmed);
  const [otherConfirmed, setOtherConfirmed] = useState(initialOtherConfirmed);
  const [dealConfirmed, setDealConfirmed] = useState(initialDealConfirmed);
  const [alreadyReviewed, setAlreadyReviewed] = useState(initialAlreadyReviewed);
  const [confirming, setConfirming] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setConfirming(true);
    const res = await fetch(`/api/conversations/${conversationId}/confirm-deal`, { method: "POST" });
    setConfirming(false);
    if (!res.ok) return;
    const data = await res.json();
    // If both are confirmed after my own confirm just landed, the other
    // party must have already confirmed too — that's the only way both
    // flags could be true right now.
    const bothConfirmed = Boolean(data.dealConfirmedAt);
    setMyConfirmed(true);
    setOtherConfirmed(bothConfirmed);
    setDealConfirmed(bothConfirmed);
    router.refresh();
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/conversations/${conversationId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    setAlreadyReviewed(true);
  }

  if (!dealConfirmed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded border bg-neutral-50 px-3 py-2 text-sm">
        <span>
          {myConfirmed
            ? `Waiting for ${otherUserName} to confirm the deal...`
            : otherConfirmed
              ? `${otherUserName} confirmed the deal — your turn!`
              : "Deal done? Confirm to unlock reviews."}
        </span>
        {!myConfirmed && (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="shrink-0 rounded border px-3 py-1 text-xs disabled:opacity-50"
          >
            {confirming ? "Confirming..." : "Mark deal done"}
          </button>
        )}
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <p className="rounded border bg-green-50 px-3 py-2 text-sm text-green-800">
        You&apos;ve reviewed {otherUserName}. Thanks!
      </p>
    );
  }

  return (
    <form onSubmit={handleReviewSubmit} className="flex flex-col gap-2 rounded border p-3">
      <span className="text-sm font-medium">Leave a review for {otherUserName}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-lg ${n <= rating ? "text-amber-500" : "text-neutral-300"}`}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="rounded border px-3 py-2 text-sm"
        placeholder="Optional comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
