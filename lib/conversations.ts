import "server-only";
import { prisma } from "./prisma";

export async function getConversationsForUser(userId: string) {
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

  return conversations
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
}

export type ConversationAccess =
  | { ok: true; conversation: NonNullable<Awaited<ReturnType<typeof loadConversation>>>; otherUser: { id: string; name: string } }
  | { ok: false; status: 404 | 403 };

async function loadConversation(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      listing: { select: { id: true, title: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
    },
  });
}

export async function getConversationForUser(id: string, userId: string): Promise<ConversationAccess> {
  const conversation = await loadConversation(id);
  if (!conversation) return { ok: false, status: 404 };
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
    return { ok: false, status: 403 };
  }
  const otherUser = conversation.buyerId === userId ? conversation.seller : conversation.buyer;
  return { ok: true, conversation, otherUser };
}

export async function getMessagesAndMarkRead(conversationId: string, userId: string) {
  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}
