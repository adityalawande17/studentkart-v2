import "server-only";
import { auth } from "@/auth";

export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user?.isAdmin) return null;
  return session;
}
