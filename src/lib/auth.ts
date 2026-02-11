import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "session";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  email: string;
  name?: string;
  picture?: string;
  tokens?: any;
};

export async function signSession(payload: SessionPayload) {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySession(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// OAuth state (PKCE verifier) – no cookies needed
export type OAuthStatePayload = { v: string; t: number };

export async function signOAuthState(data: OAuthStatePayload) {
  return await new SignJWT(data as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSecretKey());
}

export async function verifyOAuthState(state: string): Promise<OAuthStatePayload | null> {
  try {
    const { payload } = await jwtVerify(state, getSecretKey());
    return payload as unknown as OAuthStatePayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, jwt: string) {
  const parts = [
    `${SESSION_COOKIE}=${jwt}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Partitioned",          // ← THIS FIXES THE LOOP IN CHROME
    `Max-Age=${60 * 60 * 24 * 7}`,
  ];
  res.headers.append("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(res: Response) {
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Partitioned",
    "Max-Age=0",
  ];
  res.headers.append("Set-Cookie", parts.join("; "));
}
