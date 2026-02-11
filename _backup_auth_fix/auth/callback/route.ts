import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { signSession } from "@/lib/auth";

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

function clearCookie(res: NextResponse, name: string) {
  const cookie =
    `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`;

  res.headers.append("Set-Cookie", cookie);
}

export async function OPTIONS(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  cors(req, res);
  return res;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    const cookieState = req.cookies.get("oauth_state")?.value || "";
    const verifier = req.cookies.get("pkce_verifier")?.value || "";

    if (!cookieState || cookieState !== state) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    if (!verifier) {
      return NextResponse.json({ error: "Missing PKCE data" }, { status: 400 });
    }

    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_REDIRECT_URI!
    );

    const { tokens } = await oauth2.getToken({
      code,
      codeVerifier: verifier,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    });

    oauth2.setCredentials(tokens);

    const oauth2api = google.oauth2({ auth: oauth2, version: "v2" });
    const me = await oauth2api.userinfo.get();

    const sessionJwt = await signSession({
      email: me.data.email || "",
      name: me.data.name || "",
      picture: me.data.picture || "",
      tokens,
    });

    const res = NextResponse.redirect(process.env.APP_BASE_URL!);

    setCookie(res, "session", sessionJwt, 604800);
    clearCookie(res, "pkce_verifier");
    clearCookie(res, "oauth_state");

    cors(req, res);
    return res;

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "OAuth callback failed", detail: err.message },
      { status: 500 }
    );
  }
}

