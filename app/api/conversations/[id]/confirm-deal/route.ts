import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
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

  const buyerConfirmedDeal = isBuyer ? true : conversation.buyerConfirmedDeal;
  const sellerConfirmedDeal = isSeller ? true : conversation.sellerConfirmedDeal;
  const bothConfirmed = buyerConfirmedDeal && sellerConfirmedDeal;

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      buyerConfirmedDeal,
      sellerConfirmedDeal,
      dealConfirmedAt: bothConfirmed ? (conversation.dealConfirmedAt ?? new Date()) : conversation.dealConfirmedAt,
    },
  });

  return NextResponse.json({
    buyerConfirmedDeal: updated.buyerConfirmedDeal,
    sellerConfirmedDeal: updated.sellerConfirmedDeal,
    dealConfirmedAt: updated.dealConfirmedAt,
  });
}
