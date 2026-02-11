import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export type SessionUser = {
  email: string;
  name?: string;
  picture?: string;
  tokens?: any;
};

function getSecretKey() {
  const secret = process.env.SESSION_SECRET || "";
  if (!secret) throw new Error("Missing SESSION_SECRET");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionUser) {
  const key = getSecretKey();
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function getSession(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;

  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

