import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { signSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    const cookieState = req.cookies.get("oauth_state")?.value;
    const verifier = req.cookies.get("pkce_verifier")?.value;

    if (!cookieState || !state || state !== cookieState) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }
    if (!verifier) {
      return NextResponse.json({ error: "Missing PKCE data" }, { status: 400 });
    }

    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth.getToken({
      code,
      codeVerifier: verifier,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
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

    const res = NextResponse.redirect(process.env.APP_BASE_URL!);

    // Set session cookie
    res.cookies.set("session", sessionJwt, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Clear temp cookies
    res.cookies.set("pkce_verifier", "", { path: "/", maxAge: 0 });
    res.cookies.set("oauth_state", "", { path: "/", maxAge: 0 });

    return res;
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.json(
      { error: "OAuth callback failed", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}

