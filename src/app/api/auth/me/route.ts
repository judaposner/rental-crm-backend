import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ loggedIn: false });

  const session = await verifySession(token);
  if (!session?.email) return NextResponse.json({ loggedIn: false });

  return NextResponse.json({
    loggedIn: true,
    email: session.email,
    name: session.name || "",
    picture: session.picture || "",
  });
}

