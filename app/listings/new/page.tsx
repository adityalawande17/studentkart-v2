"use client";

import { useRouter } from "next/navigation";
import { ListingForm, type ListingFormValues } from "../listing-form";

export default function NewListingPage() {
  const router = useRouter();

  async function handleSubmit(values: ListingFormValues): Promise<string | null> {
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        description: values.description,
        price: Number(values.price),
        category: values.category,
        condition: values.condition,
        isGraduatingSoon: values.isGraduatingSoon,
        lat: Number(values.lat),
        lng: Number(values.lng),
        photoUrls: values.photoUrls,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error ?? "Something went wrong";
    }

    const { listing } = await res.json();
    router.push(`/listings/${listing.id}`);
    return null;
  }

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">New listing</h1>
      <ListingForm submitLabel="Create listing" onSubmit={handleSubmit} />
    </main>
  );
}
