"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, CONDITIONS } from "@/lib/listings";
import { PhotoUpload } from "../photo-upload";

type Row = {
  title: string;
  description: string;
  price: string;
  category: (typeof CATEGORIES)[number];
  condition: (typeof CONDITIONS)[number];
  photoUrls: string[];
};

const EMPTY_ROW: Row = {
  title: "",
  description: "",
  price: "",
  category: "other",
  condition: "good",
  photoUrls: [],
};

export default function NewBulkListingsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY_ROW }, { ...EMPTY_ROW }]);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((r) => [...r, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    setRows((r) => r.filter((_, i) => i !== index));
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't available in this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toString());
        setLng(pos.coords.longitude.toString());
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

    if (!lat || !lng) {
      setError("Location is required");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/listings/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listings: rows.map((r) => ({
          title: r.title,
          description: r.description,
          price: Number(r.price),
          category: r.category,
          condition: r.condition,
          isGraduatingSoon: true,
          lat: Number(lat),
          lng: Number(lng),
          photoUrls: r.photoUrls,
        })),
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push("/listings?graduatingSoon=true");
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Moving out? List everything at once</h1>
        <p className="text-sm text-neutral-600">
          Every item here gets flagged as graduating soon and shows up in the
          graduating-soon section on the browse page.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 rounded border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Location (shared by all items)</span>
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
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              className="flex-1 rounded border px-3 py-2"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              required
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              className="flex-1 rounded border px-3 py-2"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-col gap-2 rounded border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Item {i + 1}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-sm text-red-600 underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                placeholder="Title"
                className="rounded border px-3 py-2"
                value={row.title}
                onChange={(e) => updateRow(i, { title: e.target.value })}
                required
              />
              <textarea
                placeholder="Description"
                className="rounded border px-3 py-2"
                value={row.description}
                onChange={(e) => updateRow(i, { description: e.target.value })}
                rows={2}
                required
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  placeholder="Price (₹)"
                  className="flex-1 rounded border px-3 py-2"
                  value={row.price}
                  onChange={(e) => updateRow(i, { price: e.target.value })}
                  required
                />
                <select
                  className="flex-1 rounded border px-3 py-2"
                  value={row.category}
                  onChange={(e) =>
                    updateRow(i, { category: e.target.value as Row["category"] })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  className="flex-1 rounded border px-3 py-2"
                  value={row.condition}
                  onChange={(e) =>
                    updateRow(i, { condition: e.target.value as Row["condition"] })
                  }
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <PhotoUpload
                value={row.photoUrls}
                onChange={(urls) => updateRow(i, { photoUrls: urls })}
              />
            </div>
          ))}
        </div>

        <button type="button" onClick={addRow} className="w-fit rounded border px-3 py-1.5 text-sm">
          + Add another item
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {submitting ? "Creating listings..." : `Create ${rows.length} listings`}
        </button>
      </form>
    </main>
  );
}
