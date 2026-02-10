import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { signSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    // Read cookies set by /api/auth/login
    const cookieState = req.cookies.get("oauth_state")?.value;
    const verifier = req.cookies.get("pkce_verifier")?.value;

    if (!state || !cookieState || state !== cookieState) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }
    if (!verifier) {
      return NextResponse.json({ error: "Missing PKCE data" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const appBaseUrl = process.env.APP_BASE_URL;

    if (!clientId || !clientSecret || !redirectUri || !appBaseUrl) {
      return NextResponse.json(
        {
          error: "Missing env vars",
          missing: {
            GOOGLE_CLIENT_ID: !clientId,
            GOOGLE_CLIENT_SECRET: !clientSecret,
            GOOGLE_REDIRECT_URI: !redirectUri,
            APP_BASE_URL: !appBaseUrl,
          },
        },
        { status: 500 }
      );
    }

    const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const { tokens } = await oauth.getToken({
      code,
      codeVerifier: verifier,
    });

    oauth.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ auth: oauth, version: "v2" });
    const me = await oauth2.userinfo.get();

    const sessionJwt = await signSession({
      email: me.data.email || "",
      name: me.data.name || "",
      picture: me.data.picture || "",
      tokens,
    });

    const res = NextResponse.redirect(appBaseUrl);

    // ✅ Cross-site session cookie so Base44 can call /api/auth/me with credentials: "include"
    res.cookies.set("session", sessionJwt, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Clear temp cookies (use sameSite/secure/path consistently)
    res.cookies.set("pkce_verifier", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 0,
    });

    res.cookies.set("oauth_state", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.json(
      { error: "OAuth callback failed", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}

