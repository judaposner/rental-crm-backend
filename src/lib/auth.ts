import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  email: string;
  name?: string;
  picture?: string;
  tokens: any; // google tokens
};

function getKey() {
  const secret = process.env.SESSION_SECRET || "";
  if (!secret || secret.trim().length < 16) {
    throw new Error("SESSION_SECRET is missing/too short. Set it in .env.local and restart dev server.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey());
    return payload as any;
  } catch {
    return null;
  }
}

