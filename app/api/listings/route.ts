import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateListingInput, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/listings";
import { queryListings } from "@/lib/listings-query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const graduatingSoon = searchParams.get("graduatingSoon") === "true";
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const takeParam = searchParams.get("take");
  const take = takeParam
    ? Math.min(Math.max(Number(takeParam), 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  if (lat !== null && lng !== null) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const radiusKm = searchParams.get("radiusKm")
      ? Number(searchParams.get("radiusKm"))
      : undefined;

    if (
      !Number.isFinite(latNum) ||
      !Number.isFinite(lngNum) ||
      (radiusKm !== undefined && !Number.isFinite(radiusKm))
    ) {
      return NextResponse.json({ error: "Invalid lat/lng/radiusKm" }, { status: 400 });
    }

    const listings = await queryListings({
      graduatingSoon,
      near: { lat: latNum, lng: lngNum, radiusKm },
      take,
    });
    return NextResponse.json({ listings });
  }

  const listings = await queryListings({ graduatingSoon, take });
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
