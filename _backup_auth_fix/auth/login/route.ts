import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

function cors(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get("origin") || "";
  const allow = process.env.APP_BASE_URL || "https://rental-deal-flow.base44.app";

  if (origin === allow) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Vary", "Origin");
}

function setCookie(res: NextResponse, name: string, value: string, maxAgeSeconds: number) {
  const cookie =
    `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=None; Partitioned`;

  res.headers.append("Set-Cookie", cookie);
}

export async function OPTIONS(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  cors(req, res);
  return res;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const verifier = crypto.randomUUID() + crypto.randomUUID();
  const challenge = Buffer.from(verifier).toString("base64url");
  const state = crypto.randomUUID();

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  const res = NextResponse.redirect(authUrl);
  cors(req, res);

  setCookie(res, "oauth_state", state, 600);
  setCookie(res, "pkce_verifier", verifier, 600);

  return res;
}

