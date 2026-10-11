import "server-only";
import { allParticipants, db, displayName } from "./db";
import { HABITS } from "./season.ts";
import { longest, streak, today } from "./streak.ts";

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

/** One member's habit history for the quick-log sheet. `missing` means the table isn't there yet. */
export async function myHabitLogs(participantId: string): Promise<{ logs: HabitLog[]; missing: boolean }> {
  const { data, error } = await db().from("habit_logs").select("day, habit, value").eq("participant_id", participantId).order("day", { ascending: false }).limit(1500);
  if (error) return { logs: [], missing: true };
  return { logs: (data ?? []) as HabitLog[], missing: false };
}

/** Days with a training habit logged (push-ups, squats), which keep the main practice streak alive. */
export async function trainingHabitDays() {
  const ids = HABITS.filter((h) => h.kind === "count" && h.training).map((h) => h.id);
  if (!ids.length) return [];
  // Table not created yet: the streak counts sessions only.
  return (await allHabitRows<{ participant_id: string; day: string }>("participant_id, day", (q) => q.in("habit", ids).gt("value", 0))) ?? [];
}

export type Request = { id: number; participant_id: string | null; text: string; done: boolean; created_at: string };

export async function openRequests(): Promise<{ list: Request[]; missing: boolean }> {
  const { data, error } = await db().from("requests").select("*").eq("done", false).order("created_at", { ascending: false }).limit(100);
  if (error) return { list: [], missing: true };
  return { list: (data ?? []) as Request[], missing: false };
}

export type StreakRow = { id: string; name: string; current: number; best: number; days: number; total: number; last: string | null; slippedToday: boolean };
export type StreakBoard = { id: string; name: string; icon: string; unit: string | null; rows: StreakRow[] }[];

/** The Streaks board, one per habit and separate from the event ranks: everyone who follows it,
    ranked by current streak, then their longest. */
export async function streakBoard(): Promise<StreakBoard> {
  const [people, rows] = await Promise.all([allParticipants(), allHabitRows<HabitLog & { participant_id: string }>("participant_id, day, habit, value")]);
  const logs = rows ?? [];
  const day = today();
  return HABITS.map((h) => {
    const mine = logs.filter((l) => l.habit === h.id);
    const rows = people.filter((p) => p.accepted_at && (p.profile?.habitsOn?.includes(h.id) || mine.some((l) => l.participant_id === p.id))).map((p) => {
      const own = mine.filter((l) => l.participant_id === p.id);
      const good = own.filter((l) => l.value > 0).map((l) => l.day);
      const slippedToday = own.some((l) => l.day === day && l.value === 0);
      return {
        id: p.id, name: displayName(p), current: slippedToday ? 0 : streak(good), best: longest(good), days: good.length,
        total: own.reduce((n, l) => n + l.value, 0), last: own.map((l) => l.day).sort().pop() ?? null, slippedToday,
      };
    }).sort((a, b) => b.current - a.current || b.best - a.best || b.total - a.total || a.name.localeCompare(b.name));
    return { id: h.id, name: h.name, icon: h.icon, unit: h.kind === "count" ? h.unit : null, rows };
  });
}
