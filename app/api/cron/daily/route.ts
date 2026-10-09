import { NextResponse, type NextRequest } from "next/server";
import { allParticipants } from "@/lib/db";
import { sendDailyReminders } from "@/lib/reminders";
import { SEASON } from "@/lib/season.ts";

export const dynamic = "force-dynamic";

// Vercel Cron calls this once a day (see vercel.json) with the CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (Date.now() > new Date(SEASON.strengthWeekend).getTime()) {
    return NextResponse.json({ skipped: "Season is over" });
  }
  return NextResponse.json(await sendDailyReminders(await allParticipants()));
}
