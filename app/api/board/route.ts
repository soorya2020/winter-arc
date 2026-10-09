import { NextResponse } from "next/server";
import { currentParticipant, isAdmin } from "@/lib/auth";
import { loadBoard } from "@/lib/board";
import { recentTaunts } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentParticipant();
  if (!me?.accepted_at && !isAdmin()) return NextResponse.json({ error: "Invite only" }, { status: 401 });
  const [rows, taunts] = await Promise.all([loadBoard(), recentTaunts()]);
  return NextResponse.json({ rows, taunts, at: new Date().toISOString() });
}
