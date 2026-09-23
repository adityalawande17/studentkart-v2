"use client";

import { useRef, useState } from "react";

export function PhotoUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/listings/photos", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Failed to upload ${file.name}`);
        continue;
      }
      const data = await res.json();
      uploaded.push(data.url);
    }

    onChange([...value, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePhoto(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-neutral-700">Photos</span>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url) => (
            <div key={url} className="group relative h-20 w-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-full w-full rounded-lg object-cover shadow-sm"
              />
              <button
                type="button"
                onClick={() => removePhoto(url)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-xs text-white shadow-sm transition hover:bg-red-600"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-neutral-300 px-4 py-4 text-center text-sm text-neutral-500 transition hover:border-brand-300 hover:bg-brand-50/50">
        <span className="font-medium text-brand-700">Choose photos</span>
        <span className="text-xs">JPEG, PNG, WebP or GIF</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {uploading && <span className="text-sm text-neutral-500">Uploading...</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
