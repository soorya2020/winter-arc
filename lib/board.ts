import "server-only";
import { allParticipants, allResults, practiceDays, displayName } from "./db";
import { standings, rankMap, previousRanks, type Standing } from "./scoring.ts";
import { EVENTS, TZ } from "./season.ts";
import type { Profile } from "./profile.ts";
import { streak, lastDays } from "./streak.ts";
import { trainingHabitDays } from "./habits";
import { allBonuses } from "./bonus";

export type BoardRow = Standing & {
  rank: number;
  /** Rank before the latest scoring day, and that day (YYYY-MM-DD). Null when there's nothing to compare with yet. */
  prevRank: number | null; prevSince: string | null; streak: number; sessions: number; recent: boolean[]; catchphrase: string | null; best: string | null; profile: Profile };

/** Leaderboard of everyone who accepted their invite. */
export async function loadBoard(): Promise<BoardRow[]> {
  const [people, results, sessions, habitDays, bonuses] = await Promise.all([allParticipants(), allResults(), practiceDays(), trainingHabitDays(), allBonuses()]);
  const days = [...sessions, ...habitDays];
  const accepted = people.filter((p) => p.accepted_at);
  const byPerson = new Map<string, string[]>();
  for (const d of days) byPerson.set(d.participant_id, [...(byPerson.get(d.participant_id) ?? []), d.day]);
  const roster = accepted.map((p) => ({ id: p.id, name: displayName(p) }));
  const now = standings(roster, results, bonuses);
  const ranks = rankMap(now);
  const prev = previousRanks(roster, results, bonuses.map((b) => ({ ...b, at: b.created_at })), TZ);
  return now.map((s) => {
    const rank = ranks.get(s.id)!;
    const mine = [...new Set(byPerson.get(s.id) ?? [])];
    const scored = EVENTS.filter((e) => s.perEvent[e.id] != null);
    const best = scored.length ? scored.reduce((hi, e) => (s.perEvent[e.id] > s.perEvent[hi.id] ? e : hi)).name : null;
    const person = accepted.find((p) => p.id === s.id);
    return { ...s, rank, prevRank: prev?.ranks.get(s.id) ?? null, prevSince: prev?.since ?? null, streak: streak(mine), sessions: mine.length, recent: lastDays(mine), catchphrase: person?.catchphrase ?? null, best, profile: person?.profile ?? {} };
  });
}
