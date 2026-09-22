import "server-only";
import { SignJWT } from "jose";

const CHAT_TOKEN_TTL_SECONDS = 5 * 60;

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Short-lived token proving "this request is really user X", handed to the
 * client so it can authenticate the socket handshake with the standalone
 * chat service. The chat service verifies it with the same AUTH_SECRET —
 * it never sees the NextAuth session cookie, which stays httpOnly and
 * same-origin as intended.
 */
export async function signChatToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CHAT_TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}
