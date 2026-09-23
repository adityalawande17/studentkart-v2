import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getConversationsForUser } from "@/lib/conversations";

export default async function ConversationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const conversations = await getConversationsForUser(session.user.id);

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Conversations</h1>

      {conversations.length === 0 ? (
        <div className="rounded border border-dashed p-12 text-center text-neutral-500">
          No conversations yet. Start one from a listing you&apos;re interested in.
        </div>
      ) : (
        <div className="flex flex-col divide-y rounded border">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-neutral-50"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{c.otherUser.name}</span>
                <span className="text-xs text-neutral-500">{c.listing.title}</span>
                {c.lastMessage && (
                  <span className="truncate text-sm text-neutral-600">{c.lastMessage.body}</span>
                )}
              </div>
              {c.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1.5 text-xs text-white">
                  {c.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
