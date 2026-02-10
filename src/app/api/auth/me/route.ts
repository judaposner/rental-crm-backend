import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session) {
    return NextResponse.json({ loggedIn: false }, { status: 200 });
  }

  return NextResponse.json({
    loggedIn: true,
    email: session.email,
    name: session.name,
    picture: session.picture,
  });
}

