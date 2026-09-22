"use client";

import { useState } from "react";
import { CATEGORIES, CONDITIONS } from "@/lib/listings";

export type ListingFormValues = {
  title: string;
  description: string;
  price: string;
  category: (typeof CATEGORIES)[number];
  condition: (typeof CONDITIONS)[number];
  isGraduatingSoon: boolean;
  lat: string;
  lng: string;
};

const EMPTY_VALUES: ListingFormValues = {
  title: "",
  description: "",
  price: "",
  category: "other",
  condition: "good",
  isGraduatingSoon: false,
  lat: "",
  lng: "",
};

export function ListingForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<ListingFormValues>;
  submitLabel: string;
  onSubmit: (values: ListingFormValues) => Promise<string | null>;
}) {
  const [values, setValues] = useState<ListingFormValues>({
    ...EMPTY_VALUES,
    ...initialValues,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  function update<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't available in this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("lat", pos.coords.latitude.toString());
        update("lng", pos.coords.longitude.toString());
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location — enter it manually");
        setLocating(false);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await onSubmit(values);
    setSubmitting(false);
    if (result) setError(result);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          className="rounded border px-3 py-2"
          value={values.title}
          onChange={(e) => update("title", e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          className="rounded border px-3 py-2"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Price (₹)
        <input
          type="number"
          min="1"
          step="1"
          className="rounded border px-3 py-2"
          value={values.price}
          onChange={(e) => update("price", e.target.value)}
          required
        />
      </label>
      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Category
          <select
            className="rounded border px-3 py-2"
            value={values.category}
            onChange={(e) => update("category", e.target.value as ListingFormValues["category"])}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Condition
          <select
            className="rounded border px-3 py-2"
            value={values.condition}
            onChange={(e) =>
              update("condition", e.target.value as ListingFormValues["condition"])
            }
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isGraduatingSoon}
          onChange={(e) => update("isGraduatingSoon", e.target.checked)}
        />
        I&apos;m graduating soon — flag this as part of a move-out sale
      </label>

      <div className="flex flex-col gap-2 rounded border p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Location</span>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="text-sm underline disabled:opacity-50"
          >
            {locating ? "Locating..." : "Use my current location"}
          </button>
        </div>
        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Latitude
            <input
              type="number"
              step="any"
              className="rounded border px-3 py-2"
              value={values.lat}
              onChange={(e) => update("lat", e.target.value)}
              required
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Longitude
            <input
              type="number"
              step="any"
              className="rounded border px-3 py-2"
              value={values.lng}
              onChange={(e) => update("lng", e.target.value)}
              required
            />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
