import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sha256(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest();
}

export async function GET(_req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error: "Missing env vars",
        missing: {
          GOOGLE_CLIENT_ID: !clientId,
          GOOGLE_REDIRECT_URI: !redirectUri,
        },
      },
      { status: 500 }
    );
  }

  // PKCE
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(sha256(verifier));

  // CSRF state
  const state = base64url(crypto.randomBytes(16));

  const scope = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(authUrl.toString());

  // ✅ Critical for cross-site OAuth (Base44 -> Vercel)
  // These MUST be SameSite=None + Secure so the browser sends them on the callback.
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  res.cookies.set("pkce_verifier", verifier, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 10,
  });

  return res;
}

