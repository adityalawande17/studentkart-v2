"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_RADIUS_KM } from "@/lib/listings";

export function NearMeButton({ active }: { active: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goNear() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't available in this browser");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("lat", pos.coords.latitude.toString());
        params.set("lng", pos.coords.longitude.toString());
        params.set("radiusKm", DEFAULT_RADIUS_KM.toString());
        setLocating(false);
        router.push(`/listings?${params.toString()}`);
      },
      () => {
        setError("Couldn't get your location");
        setLocating(false);
      }
    );
  }

  function clearNear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("lat");
    params.delete("lng");
    params.delete("radiusKm");
    const qs = params.toString();
    router.push(qs ? `/listings?${qs}` : "/listings");
  }

  if (active) {
    return (
      <button
        onClick={clearNear}
        className="rounded-full bg-brand-600 px-3 py-1.5 font-medium text-white transition hover:bg-brand-700"
      >
        Near me (within {DEFAULT_RADIUS_KM}km) ×
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goNear}
        disabled={locating}
        className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
      >
        {locating ? "Locating..." : `Near me (${DEFAULT_RADIUS_KM}km)`}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
