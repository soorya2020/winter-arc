import { CATEGORIES, EVENTS, MAX_PER_EVENT, SCORED_EVENTS, type CategoryId, type Scoring, type SeasonEvent } from "./season.ts";

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Points for one raw result. 0 or less means did not finish. */
export function points(scoring: Scoring, value: number | null | undefined): number {
  if (scoring.kind === "tba" || value == null || !Number.isFinite(value) || value <= 0) return 0;
  if (scoring.kind === "per_unit") {
    return round1(Math.min(MAX_PER_EVENT, Math.min(value, scoring.cap) * scoring.perUnit));
  }
  if (value <= scoring.target) return MAX_PER_EVENT;
  const steps = Math.ceil((value - scoring.target) / scoring.step - 1e-9);
  return Math.max(scoring.floor, MAX_PER_EVENT - steps * scoring.stepPoints);
}

/** Accepts "14.2", "15:30" or "1:02:05" and returns a number (seconds for times). */
export function parseValue(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  if (s.includes(":")) {
    const parts = s.split(":").map(Number);
    if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function isTimeInput(ev: SeasonEvent) {
  return ev.unit.startsWith("time (mm:ss)");
}

export function formatValue(ev: SeasonEvent, value: number | null | undefined): string {
  if (value == null) return "";
  if (isTimeInput(ev)) {
    const m = Math.floor(value / 60);
    const sec = Math.round(value % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  }
  return String(value);
}

export type ResultRow = { participant_id: string; event_id: string; value: number; baseline: boolean };

export type BonusRow = { participant_id: string; points: number };

export type Standing = {
  id: string;
  name: string;
  perEvent: Record<string, number>; // event id -> points, only events with rules decided
  byCategory: Record<CategoryId, number>;
  bonus: number; // custom points from the organizer, can be negative
  total: number; // event points plus bonus
  baselineTotal: number;
  leap: number;
  limit: string | null; // event with the lowest share of its cap, once all are scored
};

export function standings(people: { id: string; name: string }[], results: ResultRow[], bonuses: BonusRow[] = []): Standing[] {
  const rows = people.map((p) => {
    const perEvent: Record<string, number> = {};
    const base: Record<string, number> = {};
    for (const r of results) {
      if (r.participant_id !== p.id) continue;
      const ev = SCORED_EVENTS.find((e) => e.id === r.event_id);
      if (!ev) continue;
      (r.baseline ? base : perEvent)[ev.id] = points(ev.scoring, Number(r.value));
    }
    const sum = (c?: CategoryId) =>
      round1(EVENTS.filter((e) => !c || e.category === c).reduce((a, e) => a + (perEvent[e.id] ?? 0), 0));
    const events = sum();
    const bonus = round1(bonuses.filter((b) => b.participant_id === p.id).reduce((a, b) => a + Number(b.points), 0));
    const total = round1(events + bonus);
    const baselineTotal = round1(Object.values(base).reduce((a, b) => a + b, 0));
    const scored = SCORED_EVENTS.filter((e) => perEvent[e.id] != null);
    const limitEv = scored.length === SCORED_EVENTS.length
      ? scored.reduce((lo, e) => (perEvent[e.id] < perEvent[lo.id] ? e : lo))
      : null;
    return {
      id: p.id,
      name: p.name,
      perEvent,
      byCategory: Object.fromEntries(CATEGORIES.map((c) => [c.id, sum(c.id)])) as Record<CategoryId, number>,
      bonus,
      total,
      baselineTotal,
      leap: Object.keys(base).length ? round1(events - baselineTotal) : 0,
      limit: limitEv?.name ?? null,
    };
  });
  return rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
