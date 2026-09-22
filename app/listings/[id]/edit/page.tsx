"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ListingForm, type ListingFormValues } from "../../listing-form";

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [initialValues, setInitialValues] = useState<Partial<ListingFormValues> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/listings/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.listing) {
          setLoadError("Listing not found");
          return;
        }
        const l = data.listing;
        setInitialValues({
          title: l.title,
          description: l.description,
          price: l.price.toString(),
          category: l.category,
          condition: l.condition,
          isGraduatingSoon: l.isGraduatingSoon,
          lat: l.lat.toString(),
          lng: l.lng.toString(),
        });
      })
      .catch(() => setLoadError("Failed to load listing"));
  }, [params.id]);

  async function handleSubmit(values: ListingFormValues): Promise<string | null> {
    const res = await fetch(`/api/listings/${params.id}`, {
      method: "PATCH",
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
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error ?? "Something went wrong";
    }

    router.push(`/listings/${params.id}`);
    return null;
  }

  if (loadError) {
    return (
      <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 px-4 py-10">
        <p className="text-red-600">{loadError}</p>
      </main>
    );
  }

  if (!initialValues) {
    return (
      <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 px-4 py-10">
        <p className="text-neutral-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Edit listing</h1>
      <ListingForm
        initialValues={initialValues}
        submitLabel="Save changes"
        onSubmit={handleSubmit}
      />
    </main>
  );
}
