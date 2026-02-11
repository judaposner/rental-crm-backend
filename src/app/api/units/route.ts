import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";
import { google } from "googleapis";

function corsify(req: NextRequest, res: NextResponse) {
  let origin = req.headers.get("origin") || "";
  if (origin.endsWith("/")) origin = origin.slice(0, -1);
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
      range: "Monsey!A:AE",  // Up to 'Unit ID' column (30 columns)
    });

    const rows = response.data.values || [];
    const units = rows.slice(1).map((row) => ({
      term: row[1],
      permission: row[2],
      pictures: row[3],
      name: row[4],
      phone: row[5],
      address: row[6],
      apartment: row[7],
      neighborhood: row[8],
      town: row[9],
      appointmentType: row[10],
      appointmentTime: row[11],
      notes: row[12],
      rentSale: row[13],
      type: row[14],
      propertyContact: row[15],
      email: row[16],
      website: row[17],
      rent: row[18],
      leaseTerm: row[19],
      utilities: row[20],
      sqft: row[21],
      bedroom: row[22],
      bath: row[23],
      appliances: row[24],
      amenities: row[25],
      pets: row[26],
      posted: row[27],
      comission: row[28],
      unitId: row[29],
    }));

    return corsify(req, NextResponse.json({ units }));
  } catch (err: any) {
    console.error("Units Sheets GET error:", err.message, err.response ? err.response.data : '');
    return corsify(req, NextResponse.json({ error: "Failed to fetch units" }, { status: 500 }));
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

    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "Monsey!A:AE",
    });
    const rows = getResponse.data.values || [];
    const newId = rows.length;  // Row number as ID

    const newRow = [
      '', body.term, body.permission, body.pictures, body.name, body.phone, body.address, body.apartment,
      body.neighborhood, body.town, body.appointmentType, body.appointmentTime, body.notes, body.rentSale,
      body.type, body.propertyContact, body.email, body.website, body.rent, body.leaseTerm, body.utilities, body.sqft,
      body.bedroom, body.bath, body.appliances, body.amenities, body.pets, body.posted, body.comission, body.unitId
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "Monsey!A:AE",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [newRow] },
    });

    return corsify(req, NextResponse.json({ unit: { id: newId, ...body } }, { status: 201 }));
  } catch (err: any) {
    console.error("Units Sheets POST error:", err.message, err.response ? err.response.data : '');
    return corsify(req, NextResponse.json({ error: "Failed to add unit" }, { status: 500 }));
  }
}
