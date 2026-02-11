import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";
import { google } from "googleapis";

export const runtime = "nodejs";

// Add CORS if not already (copy from your /me route for consistency)
function corsify(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get("origin");
  const allowed = new Set(["https://rental-deal-flow.base44.app", "http://localhost:3000"]);
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
  const session = await verifySession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const oauth = new google.auth.OAuth2();
    oauth.setCredentials(session.tokens);

    const sheets = google.sheets({ version: "v4", auth: oauth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,  // Add this env var if missing
      range: "Sheet1!A:Z",  // Customize as needed
    });

    return corsify(req, NextResponse.json({ data: response.data.values }));
  } catch (err: any) {
    console.error("Sheets error:", err);
    return corsify(req, NextResponse.json({ error: "Sheets failure", detail: err.message }, { status: 500 }));
  }
}
