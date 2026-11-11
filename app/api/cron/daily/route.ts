import { NextResponse, type NextRequest } from "next/server";
import { allParticipants } from "@/lib/db";
import { sendDailyReminders } from "@/lib/reminders";
import { SEASON } from "@/lib/season.ts";

export const dynamic = "force-dynamic";

// Vercel Cron calls this once a day with the key from vercel.json (keep the two in sync).
// A CRON_SECRET env var, if ever set, also works: Vercel then sends it as a Bearer header.
const CRON_KEY = "HUrDQIoKccm2bduKs2MAklaq";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const ok = req.nextUrl.searchParams.get("key") === CRON_KEY
    || (!!secret && req.headers.get("authorization") === `Bearer ${secret}`);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (Date.now() > new Date(SEASON.strengthWeekend).getTime()) {
    return NextResponse.json({ skipped: "Season is over" });
  }
  return NextResponse.json(await sendDailyReminders(await allParticipants()));
}
