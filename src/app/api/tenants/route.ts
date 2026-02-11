import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";
import { google } from "googleapis";

function corsify(req: NextRequest, res: NextResponse) {
  let origin = req.headers.get("origin") || "";
  if (origin.endsWith("/")) origin = origin.slice(0, -1);  // Handle trailing slash
  const allowed = new Set(["https://rental-deal-flow.base44.app", "http://localhost:3000"]);
  if (allowed.has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export async function OPTIONS(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  return corsify(req, res);
}

export async function GET(req: NextRequest) {
  const session = await verifySession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const oauth = new google.auth.OAuth2();
    oauth.setCredentials(session.tokens);

    const sheets = google.sheets({ version: "v4", auth: oauth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "Tenants!A:Z",  // Adjust if columns are more
    });

    const rows = response.data.values || [];
    const tenants = rows.slice(1).map((row) => ({  // Map to your columns
      name: row[0],
      phone: row[1],
      location: row[2],
      budget: row[3],
      amenities: row[4],
      desiredBedsBath: row[5],
      requestedNotes: row[6],
      looking: row[7],
      shownInPast: row[8],
      sentAddresses: row[9],
      response: row[10],
      matchingProperty: row[11],
      moveInDate: row[12],
      tenantId: row[13],
    }));

    return corsify(req, NextResponse.json({ tenants }));
  } catch (err: any) {
    console.error("Sheets GET error:", err);
    return corsify(req, NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  const session = await verifySession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const oauth = new google.auth.OAuth2();
    oauth.setCredentials(session.tokens);

    const sheets = google.sheets({ version: "v4", auth: oauth });

    // Get current rows to generate ID
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "Tenants!A:Z",
    });
    const rows = getResponse.data.values || [];
    const newId = rows.length;  // ID = row number

    // Map body to your columns (adjust order)
    const newRow = [
      body.name, body.phone, body.location, body.budget, body.amenities, body.desiredBedsBath,
      body.requestedNotes, body.looking, body.shownInPast, body.sentAddresses, body.response,
      body.matchingProperty, body.moveInDate, body.tenantId
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "Tenants!A:Z",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [newRow] },
    });

    return corsify(req, NextResponse.json({ tenant: { id: newId, ...body } }, { status: 201 }));
  } catch (err: any) {
    console.error("Sheets POST error:", err);
    return corsify(req, NextResponse.json({ error: "Failed to add tenant" }, { status: 500 }));
  }
}
