import "server-only";
import { db } from "./db";
import { HABITS } from "./season.ts";

export const HABITS_SQL = `create table if not exists habit_logs (participant_id uuid not null references participants(id) on delete cascade, day date not null, habit text not null, value int not null check (value between 0 and 10000), updated_at timestamptz not null default now(), primary key (participant_id, day, habit)); alter table habit_logs enable row level security; create table if not exists requests (id bigserial primary key, participant_id uuid references participants(id) on delete set null, text text not null check (char_length(text) between 3 and 300), done boolean not null default false, created_at timestamptz not null default now()); alter table requests enable row level security;`;

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
  const { data, error } = await db().from("habit_logs").select("participant_id, day").in("habit", ids).gt("value", 0);
  if (error) return []; // table not created yet: the streak counts sessions only
  return (data ?? []) as { participant_id: string; day: string }[];
}

export type Request = { id: number; participant_id: string | null; text: string; done: boolean; created_at: string };

export async function openRequests(): Promise<{ list: Request[]; missing: boolean }> {
  const { data, error } = await db().from("requests").select("*").eq("done", false).order("created_at", { ascending: false }).limit(100);
  if (error) return { list: [], missing: true };
  return { list: (data ?? []) as Request[], missing: false };
}
