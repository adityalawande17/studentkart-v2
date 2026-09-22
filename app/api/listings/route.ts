import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateListingInput } from "@/lib/listings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const graduatingSoon = searchParams.get("graduatingSoon") === "true";

  const listings = await prisma.listing.findMany({
    where: graduatingSoon ? { isGraduatingSoon: true } : undefined,
    include: { photos: true, seller: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ listings });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const input = validateListingInput(body);
  if ("error" in input) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  const listing = await prisma.listing.create({
    data: {
      sellerId: session.user.id,
      title: input.title,
      description: input.description,
      price: input.price,
      category: input.category,
      condition: input.condition,
      isGraduatingSoon: input.isGraduatingSoon,
      lat: input.lat,
      lng: input.lng,
      photos: {
        create: input.photoUrls.map((url) => ({ url })),
      },
    },
    include: { photos: true },
  });

  return NextResponse.json({ listing }, { status: 201 });
}
