import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

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

export async function OPTIONS(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  cors(req, res);
  return res;
}

export async function GET(req: NextRequest) {
  const session = req.cookies.get("session")?.value;

  if (!session) {
    return NextResponse.json({ loggedIn: false });
  }

  const data = await verifySession(session);

  if (!data) {
    return NextResponse.json({ loggedIn: false });
  }

  return NextResponse.json({
    loggedIn: true,
    email: data.email,
    name: data.name,
    picture: data.picture,
  });
}

