import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

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
  const session = await verifySession(req);

  const res = NextResponse.json(
    session
      ? { loggedIn: true, email: session.email, name: session.name, picture: session.picture }
      : { loggedIn: false },
    { status: 200 }
  );

  return corsify(req, res);
}
