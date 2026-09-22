import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    include: {
      listing: { select: { id: true, title: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const unreadCounts = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: userId },
      readAt: null,
    },
    _count: true,
  });
  const unreadByConversation = new Map(unreadCounts.map((u) => [u.conversationId, u._count]));

  const shaped = conversations
    .map((c) => {
      const isBuyer = c.buyerId === userId;
      const otherUser = isBuyer ? c.seller : c.buyer;
      const lastMessage = c.messages[0] ?? null;
      return {
        id: c.id,
        listing: c.listing,
        otherUser,
        lastMessage,
        unreadCount: unreadByConversation.get(c.id) ?? 0,
        lastActivityAt: (lastMessage?.createdAt ?? c.createdAt).toISOString(),
      };
    })
    .sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1));

  return NextResponse.json({ conversations: shaped });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const listingId = (body as { listingId?: string })?.listingId;
  if (!listingId || typeof listingId !== "string") {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.sellerId === session.user.id) {
    return NextResponse.json(
      { error: "You can't start a conversation about your own listing" },
      { status: 400 }
    );
  }

  const conversation = await prisma.conversation.upsert({
    where: { listingId_buyerId: { listingId, buyerId: session.user.id } },
    update: {},
    create: { listingId, buyerId: session.user.id, sellerId: listing.sellerId },
    include: {
      listing: { select: { id: true, title: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ conversation });
}
