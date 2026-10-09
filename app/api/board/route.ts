import { NextResponse } from "next/server";
import { currentParticipant, isAdmin } from "@/lib/auth";
import { loadBoard } from "@/lib/board";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentParticipant();
  if (!me?.accepted_at && !isAdmin()) return NextResponse.json({ error: "Invite only" }, { status: 401 });
  return NextResponse.json({ rows: await loadBoard(), at: new Date().toISOString() });
}
