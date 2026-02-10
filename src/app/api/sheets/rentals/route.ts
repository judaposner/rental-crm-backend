import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getSheetsClient } from "@/lib/google";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);

    if (!session || !session.tokens) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const sheets = getSheetsClient(session.tokens);

    const spreadsheetId = process.env.SHEETS_ID;
    const range = process.env.SHEETS_RANGE || "Monsey!A:Z";

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Missing SHEETS_ID" }, { status: 500 });
    }

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return NextResponse.json({
      spreadsheetId,
      range,
      values: resp.data.values || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Sheets read failed", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}

