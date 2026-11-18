import { EVENTS, SCORED_EVENTS } from "./season.ts";
import { formatValue, points, rankMap, scoringDay, standings, type BonusRow, type Dated, type ResultRow } from "./scoring.ts";

// The admin export: every scored entry in the order it was saved, with each member's running
// total and rank after it. Made for building leaderboard race videos without screenshots.

export type LogEntry = {
  at: string; // when it was saved (ISO)
  day: string; // YYYY-MM-DD in the season's time zone
  member: string;
  member_id: string;
  event: string; // event name, or "Bonus"
  result: string; // raw result as typed (e.g. 15:30, 42), or the bonus reason
  points: number;
  running_total: number; // this member's total after this entry
  rank_after: number; // this member's rank on the board right after this entry
};

export type RankRow = { rank: number; member: string; member_id: string; total: number; bonus: number } & Record<string, string | number>;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildLog(
  people: { id: string; name: string }[],
  results: (ResultRow & Dated)[],
  bonuses: (BonusRow & Dated & { reason?: string | null })[] = [],
  tz?: string,
): LogEntry[] {
  const names = new Map(people.map((p) => [p.id, p.name]));
  type Item = { at: string; id: string; event: string; result: string; points: number; res?: ResultRow & Dated; bonus?: BonusRow & Dated };
  const items: Item[] = [];
  for (const r of results) {
    if (r.baseline || !names.has(r.participant_id)) continue;
    const ev = SCORED_EVENTS.find((e) => e.id === r.event_id);
    if (!ev) continue;
    items.push({ at: r.at ?? "", id: r.participant_id, event: ev.name, result: formatValue(ev, Number(r.value)), points: points(ev.scoring, Number(r.value)), res: r });
  }
  for (const b of bonuses) {
    if (!names.has(b.participant_id)) continue;
    items.push({ at: b.at ?? "", id: b.participant_id, event: "Bonus", result: b.reason ?? "", points: round1(Number(b.points)), bonus: b });
  }
  items.sort((a, b) => a.at.localeCompare(b.at));

  // Replay the season one entry at a time so rank_after matches the real board's tie rules.
  const seenResults: (ResultRow & Dated)[] = results.filter((r) => r.baseline);
  const seenBonuses: (BonusRow & Dated)[] = [];
  return items.map((it) => {
    if (it.res) seenResults.push(it.res);
    if (it.bonus) seenBonuses.push(it.bonus);
    const board = standings(people, seenResults, seenBonuses);
    const ranks = rankMap(board);
    return {
      at: it.at,
      day: it.at ? scoringDay(it.at, tz) : "",
      member: names.get(it.id)!,
      member_id: it.id,
      event: it.event,
      result: it.result,
      points: it.points,
      running_total: board.find((s) => s.id === it.id)!.total,
      rank_after: ranks.get(it.id)!,
    };
  });
}

/** Current ranks with points per event, one row per member. */
export function currentRanks(people: { id: string; name: string }[], results: ResultRow[], bonuses: BonusRow[] = []): RankRow[] {
  const board = standings(people, results, bonuses);
  const ranks = rankMap(board);
  return board.map((s) => ({
    rank: ranks.get(s.id)!,
    member: s.name,
    member_id: s.id,
    total: s.total,
    bonus: s.bonus,
    ...Object.fromEntries(EVENTS.map((e) => [e.name, s.perEvent[e.id] ?? ""])),
  }));
}

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Rows of plain objects to CSV, columns from the first row. */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  return [cols.map(cell).join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
}
