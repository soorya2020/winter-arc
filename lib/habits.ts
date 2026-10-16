import "server-only";
import { allParticipants, db, displayName, type Participant } from "./db";
import { HABITS } from "./season.ts";
import { countedDays, longest, streak, today, type StreakClaim } from "./streak.ts";

export const HABITS_SQL = `create table if not exists habit_logs (participant_id uuid not null references participants(id) on delete cascade, day date not null, habit text not null, value int not null check (value between 0 and 10000), updated_at timestamptz not null default now(), primary key (participant_id, day, habit)); alter table habit_logs enable row level security; create table if not exists requests (id bigserial primary key, participant_id uuid references participants(id) on delete set null, text text not null check (char_length(text) between 3 and 300), done boolean not null default false, created_at timestamptz not null default now()); alter table requests enable row level security;`;

/** Every row of a habit_logs query, a page at a time (Supabase returns at most 1000 per request). Null if the table is missing. */
async function allHabitRows<T>(columns: string, where: (q: any) => any = (q) => q): Promise<T[] | null> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await where(db().from("habit_logs").select(columns)).order("day").range(from, from + 999);
    if (error) return null;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

export type HabitLog = { day: string; habit: string; value: number };

/** Starting points for the auto-counting habits (No-fap, Beedi Break, Gym): the member's own entered streak, or else the day
    they started following it. Following since before this was recorded counts from their first log, or the day they joined. */
export function autoClaims(p: Pick<Participant, "profile" | "accepted_at">, logs: { day: string; habit: string }[]): Record<string, StreakClaim> {
  const out: Record<string, StreakClaim> = {};
  for (const h of HABITS) {
    if (h.kind !== "check" || !h.claim) continue;
    const own = p.profile?.habitClaims?.[h.id];
    if (own) { out[h.id] = own; continue; }
    if (!p.profile?.habitsOn?.includes(h.id)) continue;
    const first = logs.filter((l) => l.habit === h.id).map((l) => l.day).sort()[0];
    const joined = p.accepted_at ? today(new Date(p.accepted_at)) : today();
    out[h.id] = { days: 1, on: first && first < joined ? first : joined };
  }
  return out;
}

/** A member's longest run on one habit, from their logs and starting point plus the best already saved. */
export async function bestStreak(p: Pick<Participant, "id" | "profile" | "accepted_at">, id: string) {
  const { data } = await db().from("habit_logs").select("day, habit, value").eq("participant_id", p.id).eq("habit", id);
  const own = (data ?? []) as HabitLog[];
  const good = countedDays(own.filter((l) => l.value > 0).map((l) => l.day), own.filter((l) => l.value === 0).map((l) => l.day), autoClaims(p, own)[id]);
  return Math.max(longest(good), p.profile?.habitBest?.[id] ?? 0);
}

/** One member's habit history for the quick-log sheet. `missing` means the table isn't there yet. */
export async function myHabitLogs(participantId: string): Promise<{ logs: HabitLog[]; missing: boolean }> {
  const { data, error } = await db().from("habit_logs").select("day, habit, value").eq("participant_id", participantId).order("day", { ascending: false }).limit(1500);
  if (error) return { logs: [], missing: true };
  return { logs: (data ?? []) as HabitLog[], missing: false };
}

/** Days with a training habit logged (running, gym), which keep the main practice streak alive. Gym rest days (value 2) don't. */
export async function trainingHabitDays() {
  const ids = HABITS.filter((h) => h.training).map((h) => h.id);
  if (!ids.length) return [];
  // Table not created yet: the streak counts sessions only.
  const rows = await allHabitRows<{ participant_id: string; day: string; habit: string; value: number }>("participant_id, day, habit, value", (q) => q.in("habit", ids).gt("value", 0));
  return (rows ?? []).filter((r) => HABITS.find((h) => h.id === r.habit)?.kind === "count" || r.value === 1).map(({ participant_id, day }) => ({ participant_id, day }));
}

export type Request = { id: number; participant_id: string | null; text: string; done: boolean; created_at: string };

export async function openRequests(): Promise<{ list: Request[]; missing: boolean }> {
  const { data, error } = await db().from("requests").select("*").eq("done", false).order("created_at", { ascending: false }).limit(100);
  if (error) return { list: [], missing: true };
  return { list: (data ?? []) as Request[], missing: false };
}

export type StreakRow = { id: string; name: string; current: number; best: number; days: number; total: number; last: string | null; slippedToday: boolean; rests: number; claim: StreakClaim | null };
export type StreakBoard = { id: string; name: string; icon: string; unit: string | null; rows: StreakRow[] }[];

/** The Streaks board, one per habit and separate from the event ranks: everyone who follows it,
    ranked by current streak, then their longest. */
export async function streakBoard(): Promise<StreakBoard> {
  const [people, rows] = await Promise.all([allParticipants(), allHabitRows<HabitLog & { participant_id: string }>("participant_id, day, habit, value")]);
  const logs = rows ?? [];
  const day = today();
  return HABITS.map((h) => {
    const mine = logs.filter((l) => l.habit === h.id);
    const rows = people.filter((p) => p.accepted_at && (p.profile?.habitsOn?.includes(h.id) || p.profile?.habitClaims?.[h.id] || mine.some((l) => l.participant_id === p.id))).map((p) => {
      const own = mine.filter((l) => l.participant_id === p.id);
      const claim = autoClaims(p, own)[h.id] ?? null;
      const good = countedDays(own.filter((l) => l.value > 0).map((l) => l.day), own.filter((l) => l.value === 0).map((l) => l.day), claim);
      const slippedToday = own.some((l) => l.day === day && l.value === 0);
      return {
        id: p.id, name: displayName(p), current: slippedToday ? 0 : streak(good), best: Math.max(longest(good), p.profile?.habitBest?.[h.id] ?? 0), days: own.filter((l) => l.value > 0).length,
        total: own.reduce((n, l) => n + l.value, 0), last: own.map((l) => l.day).sort().pop() ?? null, slippedToday, claim,
        rests: h.kind === "check" && h.rest ? own.filter((l) => l.value === 2).length : 0,
      };
    }).sort((a, b) => b.current - a.current || b.best - a.best || b.total - a.total || a.name.localeCompare(b.name));
    return { id: h.id, name: h.name, icon: h.icon, unit: h.kind === "count" ? h.unit : null, rows };
  });
}
