import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateListingInput } from "@/lib/listings";
import { moderateListingContent } from "@/lib/moderation";

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

  const moderations = await Promise.all(
    inputs.map((input) =>
      moderateListingContent({ title: input.title, description: input.description, price: input.price })
    )
  );

  const listings = await prisma.$transaction(
    inputs.map((input, i) =>
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
          moderationStatus: moderations[i].flagged ? "pending" : "approved",
          moderationReason: moderations[i].flagged ? moderations[i].reason : null,
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
