import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getConversationForUser, getMessagesAndMarkRead } from "@/lib/conversations";
import { ChatThread } from "./chat-thread";

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
    </main>
  );
}
