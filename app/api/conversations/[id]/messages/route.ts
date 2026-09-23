import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getConversationForUser, getMessagesAndMarkRead } from "@/lib/conversations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const access = await getConversationForUser(id, session.user.id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 404 ? "Conversation not found" : "Forbidden" },
      { status: access.status }
    );
  }

  const messages = await getMessagesAndMarkRead(id, session.user.id);
  return NextResponse.json({ messages });
}
