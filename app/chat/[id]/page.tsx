import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getConversationForUser, getMessagesAndMarkRead, hasReviewed } from "@/lib/conversations";
import { ChatThread } from "./chat-thread";
import { DealConfirmation } from "./deal-confirmation";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const access = await getConversationForUser(id, session.user.id);
  if (!access.ok) {
    notFound();
  }

  const messages = await getMessagesAndMarkRead(id, session.user.id);
  const isBuyer = access.conversation.buyerId === session.user.id;
  const myConfirmed = isBuyer
    ? access.conversation.buyerConfirmedDeal
    : access.conversation.sellerConfirmedDeal;
  const otherConfirmed = isBuyer
    ? access.conversation.sellerConfirmedDeal
    : access.conversation.buyerConfirmedDeal;
  const dealConfirmed = access.conversation.dealConfirmedAt !== null;
  const alreadyReviewed = dealConfirmed
    ? await hasReviewed(access.conversation.listingId, session.user.id, access.otherUser.id)
    : false;

  return (
    <main className="mx-auto flex h-[calc(100vh-2rem)] max-w-2xl flex-1 flex-col gap-4 px-4 py-4">
      <div className="flex flex-col gap-1">
        <Link href="/chat" className="text-sm underline">
          ← All conversations
        </Link>
        <Link
          href={`/listings/${access.conversation.listing.id}`}
          className="text-sm text-neutral-600 underline"
        >
          About: {access.conversation.listing.title}
        </Link>
      </div>
      <ChatThread
        conversationId={id}
        currentUserId={session.user.id}
        otherUserId={access.otherUser.id}
        otherUserName={access.otherUser.name}
        initialMessages={messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          readAt: m.readAt?.toISOString() ?? null,
        }))}
      />
      <DealConfirmation
        conversationId={id}
        otherUserName={access.otherUser.name}
        initialMyConfirmed={myConfirmed}
        initialOtherConfirmed={otherConfirmed}
        initialDealConfirmed={dealConfirmed}
        initialAlreadyReviewed={alreadyReviewed}
      />
    </main>
  );
}
