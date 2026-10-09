import "server-only";
import { allParticipants, allResults, practiceDays, displayName } from "./db";
import { standings, type Standing } from "./scoring.ts";
import { EVENTS } from "./season.ts";
import type { Profile } from "./profile.ts";
import { streak, lastDays } from "./streak.ts";

export type BoardRow = Standing & { rank: number; streak: number; sessions: number; recent: boolean[]; catchphrase: string | null; best: string | null; profile: Profile };

/** Leaderboard of everyone who accepted their invite. */
export async function loadBoard(): Promise<BoardRow[]> {
  const [people, results, days] = await Promise.all([allParticipants(), allResults(), practiceDays()]);
  const accepted = people.filter((p) => p.accepted_at);
  const byPerson = new Map<string, string[]>();
  for (const d of days) byPerson.set(d.participant_id, [...(byPerson.get(d.participant_id) ?? []), d.day]);
  let rank = 0, last = Number.NaN;
  return standings(accepted.map((p) => ({ id: p.id, name: displayName(p) })), results).map((s, i) => {
    if (s.total !== last) { rank = i + 1; last = s.total; }
    const mine = [...new Set(byPerson.get(s.id) ?? [])];
    const scored = EVENTS.filter((e) => s.perEvent[e.id] != null);
    const best = scored.length ? scored.reduce((hi, e) => (s.perEvent[e.id] > s.perEvent[hi.id] ? e : hi)).name : null;
    const person = accepted.find((p) => p.id === s.id);
    return { ...s, rank, streak: streak(mine), sessions: mine.length, recent: lastDays(mine), catchphrase: person?.catchphrase ?? null, best, profile: person?.profile ?? {} };
  });
}
