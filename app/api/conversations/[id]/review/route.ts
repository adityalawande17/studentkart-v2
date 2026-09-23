import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const isBuyer = conversation.buyerId === session.user.id;
  const isSeller = conversation.sellerId === session.user.id;
  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!conversation.dealConfirmedAt) {
    return NextResponse.json(
      { error: "Both sides need to confirm the deal before leaving a review" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const rating = (body as { rating?: number })?.rating;
  const comment = (body as { comment?: string })?.comment;

  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be an integer from 1 to 5" }, { status: 400 });
  }
  if (comment !== undefined && typeof comment !== "string") {
    return NextResponse.json({ error: "Invalid comment" }, { status: 400 });
  }

  const rateeId = isBuyer ? conversation.sellerId : conversation.buyerId;

  const existing = await prisma.review.findUnique({
    where: {
      listingId_raterId_rateeId: {
        listingId: conversation.listingId,
        raterId: session.user.id,
        rateeId,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You've already reviewed this person for this listing" },
      { status: 409 }
    );
  }

  const review = await prisma.review.create({
    data: {
      listingId: conversation.listingId,
      raterId: session.user.id,
      rateeId,
      rating,
      comment: comment?.trim() || null,
    },
  });

  return NextResponse.json({ review }, { status: 201 });
}
