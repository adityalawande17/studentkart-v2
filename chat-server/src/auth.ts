import { jwtVerify } from "jose";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Verifies the short-lived token minted by the Next.js app's
 * /api/chat/token route. Returns the userId (the JWT's `sub`) or null
 * if the token is missing, expired, or doesn't verify.
 */
export async function verifyChatToken(token: unknown): Promise<string | null> {
  if (typeof token !== "string" || !token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
