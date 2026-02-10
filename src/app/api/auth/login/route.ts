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

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
  const appBaseUrl = process.env.APP_BASE_URL!;

  if (!clientId || !redirectUri || !appBaseUrl) {
    return NextResponse.json(
      { error: "Missing env vars: GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI / APP_BASE_URL" },
      { status: 500 }
    );
  }

  // PKCE
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());
  const state = base64url(crypto.randomBytes(16));

  const scopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
    // add later:
    // "https://www.googleapis.com/auth/calendar",
    // "https://www.googleapis.com/auth/documents.readonly",
  ];

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());

  // Store verifier + state in httpOnly cookies
  res.cookies.set("pkce_verifier", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 10, // 10 min
  });
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 10,
  });

  return res;
}

