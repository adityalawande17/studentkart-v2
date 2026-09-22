import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { signChatToken } from "@/lib/chat-token";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await signChatToken(session.user.id);
  return NextResponse.json({ token });
}
