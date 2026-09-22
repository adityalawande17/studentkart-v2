import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateListingInput } from "@/lib/listings";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const items = (body as { listings?: unknown[] })?.listings;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "listings must be a non-empty array" },
      { status: 400 }
    );
  }

  const inputs = [];
  for (const [i, item] of items.entries()) {
    const input = validateListingInput(item);
    if ("error" in input) {
      return NextResponse.json(
        { error: `Listing ${i + 1}: ${input.error}` },
        { status: 400 }
      );
    }
    inputs.push(input);
  }

  const listings = await prisma.$transaction(
    inputs.map((input) =>
      prisma.listing.create({
        data: {
          sellerId: session.user.id,
          title: input.title,
          description: input.description,
          price: input.price,
          category: input.category,
          condition: input.condition,
          isGraduatingSoon: true,
          lat: input.lat,
          lng: input.lng,
          photos: {
            create: input.photoUrls.map((url) => ({ url })),
          },
        },
        include: { photos: true },
      })
    )
  );

  return NextResponse.json({ listings }, { status: 201 });
}
