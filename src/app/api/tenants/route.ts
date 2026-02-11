import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";
import { google } from "googleapis";

function corsify(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get("origin") || "";
  const allowed = new Set(["https://rental-deal-flow.base44.app", "http://localhost:3000", "https://rental-deal-flow.base44.app/", "http://localhost:3000/"]);
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
      id: row[0],
      name: row[1],
      phone: row[2],
      address: row[3],
      apartment: row[4],
      neighborhood: row[5],
      town: row[6],
      appointmentType: row[7],
      appointmentTime: row[8],
      notes: row[9],
      rentSale: row[10],
      type: row[11],
      email: row[12],
      rent: row[13],
      leaseTerm: row[14],
      utilities: row[15],
      sqft: row[16],
      // Add more if needed
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
      newId, body.name, body.phone, body.address, body.apartment, body.neighborhood, body.town,
      body.appointmentType, body.appointmentTime, body.notes, body.rentSale, body.type,
      body.email, body.rent, body.leaseTerm, body.utilities, body.sqft
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
