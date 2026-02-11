import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

// In-memory storage for tenants (replace with Sheets later)
let tenants: any[] = [];  // Array of tenant objects, e.g., { id: 1, name: "John Doe", email: "john@example.com", unit: "Apt 101" }

function corsify(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get("origin");
  const allowed = new Set(["https://rental-deal-flow.base44.app", "http://localhost:3000"]);
  if (origin && allowed.has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
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

  return corsify(req, NextResponse.json({ tenants }));
}

export async function POST(req: NextRequest) {
  const session = await verifySession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const newTenant = { id: tenants.length + 1, ...body };
    tenants.push(newTenant);
    return corsify(req, NextResponse.json({ tenant: newTenant }, { status: 201 }));
  } catch (err) {
    return corsify(req, NextResponse.json({ error: "Invalid data" }, { status: 400 }));
  }
}
