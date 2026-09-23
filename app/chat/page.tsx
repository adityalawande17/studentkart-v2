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
    <main className="mx-auto flex w-full min-w-0 max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Conversations</h1>

      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center text-neutral-500">
          No conversations yet. Start one from a listing you&apos;re interested in.
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              className="flex items-center justify-between gap-4 p-4 transition hover:bg-neutral-50"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                  {c.otherUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium text-neutral-900">{c.otherUser.name}</span>
                  <span className="truncate text-xs text-neutral-500">{c.listing.title}</span>
                  {c.lastMessage && (
                    <span className="truncate text-sm text-neutral-600">{c.lastMessage.body}</span>
                  )}
                </div>
              </div>
              {c.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-medium text-white">
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
