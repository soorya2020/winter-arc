import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { allParticipants, allResults, displayName } from "@/lib/db";
import { allBonuses } from "@/lib/bonus";
import { buildLog, currentRanks, toCsv } from "@/lib/pointsLog.ts";
import { EVENTS, TZ } from "@/lib/season.ts";

export const dynamic = "force-dynamic";

// Admin-only download of the points log and current ranks.
//   /api/admin/export?what=log|ranks&format=csv|json   (json without `what` returns both)
export async function GET(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
  const what = url.searchParams.get("what");

  const [people, results, bonuses] = await Promise.all([allParticipants(), allResults(), allBonuses()]);
  const roster = people.filter((p) => p.accepted_at).map((p) => ({ id: p.id, name: displayName(p) }));
  const dated = bonuses.map((b) => ({ ...b, at: b.created_at }));
  const log = buildLog(roster, results, dated, TZ);
  const ranks = currentRanks(roster, results, bonuses);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const isRanks = what === "ranks";
    const body = isRanks
      ? toCsv(ranks, ["rank", "member", "member_id", "total", "bonus", ...EVENTS.map((e) => e.name)])
      : toCsv(log, ["at", "day", "member", "member_id", "event", "result", "points", "running_total", "rank_after"]);
    return new NextResponse(body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="winter-arc-${isRanks ? "ranks" : "points-log"}-${stamp}.csv"`,
        "cache-control": "no-store",
      },
    });
  }

  const data = what === "log" ? { log } : what === "ranks" ? { ranks } : { exported_at: new Date().toISOString(), timezone: TZ, ranks, log };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="winter-arc-export-${stamp}.json"`,
      "cache-control": "no-store",
    },
  });
}
