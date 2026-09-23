"use client";

import { useState } from "react";
import { CATEGORIES, CONDITIONS } from "@/lib/listings";
import { PhotoUpload } from "./photo-upload";

export type ListingFormValues = {
  title: string;
  description: string;
  price: string;
  category: (typeof CATEGORIES)[number];
  condition: (typeof CONDITIONS)[number];
  isGraduatingSoon: boolean;
  lat: string;
  lng: string;
  photoUrls: string[];
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
  photoUrls: [],
};

const inputClass =
  "min-w-0 rounded-lg border border-neutral-200 px-3 py-2 font-normal focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const labelClass = "flex min-w-0 flex-col gap-1.5 text-sm font-medium text-neutral-700";

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
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <label className={labelClass}>
          Title
          <input
            className={inputClass}
            value={values.title}
            onChange={(e) => update("title", e.target.value)}
            required
          />
        </label>
        <label className={labelClass}>
          Description
          <textarea
            className={inputClass}
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            rows={4}
            required
          />
        </label>
        <label className={labelClass}>
          Price (₹)
          <input
            type="number"
            min="1"
            step="1"
            className={inputClass}
            value={values.price}
            onChange={(e) => update("price", e.target.value)}
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className={labelClass}>
            Category
            <select
              className={inputClass}
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
          <label className={labelClass}>
            Condition
            <select
              className={inputClass}
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

        <PhotoUpload
          value={values.photoUrls}
          onChange={(urls) => update("photoUrls", urls)}
        />
      </div>

      <label
        className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm shadow-sm transition ${
          values.isGraduatingSoon
            ? "border-amber-300 bg-amber-50"
            : "border-neutral-200 bg-white hover:bg-neutral-50"
        }`}
      >
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-amber-500"
          checked={values.isGraduatingSoon}
          onChange={(e) => update("isGraduatingSoon", e.target.checked)}
        />
        <span>
          <span className="font-medium text-neutral-900">I&apos;m graduating soon</span>
          <br />
          <span className="text-neutral-500">
            Flag this as part of a move-out sale — shows up in the graduating-soon
            spotlight on the browse page.
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700">Location</span>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="text-sm font-medium text-brand-700 hover:underline disabled:opacity-50"
          >
            {locating ? "Locating..." : "Use my current location"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className={labelClass}>
            Latitude
            <input
              type="number"
              step="any"
              className={inputClass}
              value={values.lat}
              onChange={(e) => update("lat", e.target.value)}
              required
            />
          </label>
          <label className={labelClass}>
            Longitude
            <input
              type="number"
              step="any"
              className={inputClass}
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
        className="rounded-lg bg-brand-600 px-3 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
