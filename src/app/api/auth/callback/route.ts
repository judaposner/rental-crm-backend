import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { signSession, setSessionCookie, verifyOAuthState } from "@/lib/auth";

export const runtime = "nodejs";

function corsify(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get("origin");
  const allowed = new Set([
    "http://localhost:3000",
    "https://rental-deal-flow.base44.app",
  ]);

  if (origin && allowed.has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export async function OPTIONS(req: NextRequest) {
  return corsify(req, new NextResponse(null, { status: 204 }));
}

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const appBaseUrl = process.env.APP_BASE_URL;

    if (!clientId) return NextResponse.json({ error: "Missing GOOGLE_CLIENT_ID" }, { status: 500 });
    if (!clientSecret) return NextResponse.json({ error: "Missing GOOGLE_CLIENT_SECRET" }, { status: 500 });
    if (!redirectUri) return NextResponse.json({ error: "Missing GOOGLE_REDIRECT_URI" }, { status: 500 });
    if (!appBaseUrl) return NextResponse.json({ error: "Missing APP_BASE_URL" }, { status: 500 });

    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");

    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
    if (!state) return NextResponse.json({ error: "Missing state" }, { status: 400 });

    const statePayload = await verifyOAuthState(state);
    if (!statePayload?.v) return NextResponse.json({ error: "Invalid state" }, { status: 400 });

    const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const { tokens } = await oauth.getToken({
      code,
      codeVerifier: statePayload.v,
      redirect_uri: redirectUri,
    });

    oauth.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: oauth, version: "v2" });
    const me = await oauth2.userinfo.get();

    const jwt = await signSession({
      email: me.data.email || "",
      name: me.data.name || "",
      picture: me.data.picture || "",
      tokens,
    });

    const res = NextResponse.redirect(appBaseUrl);
    setSessionCookie(res, jwt);
    return corsify(req, res);
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    const res = NextResponse.json(
      { error: "OAuth callback failed", detail: err?.message || String(err) },
      { status: 500 }
    );
    return corsify(req, res);
  }
}
