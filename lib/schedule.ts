import "server-only";
import { db } from "./db";
import { SEASON, TZ } from "./season.ts";

// Events the organizer schedules in the admin panel. The next one shown on the home page
// drives the countdown. Until anything is scheduled, the season's built-in dates are used.

export type Scheduled = { id: number; title: string; starts_at: string; note: string | null; on_home: boolean };
export type Milestone = { label: string; at: string; note: string | null };

export const DEFAULTS: Milestone[] = [
  { label: "Baseline test", at: SEASON.baseline, note: null },
  { label: "Running weekend", at: SEASON.runningWeekend, note: null },
  { label: "Strength weekend", at: SEASON.strengthWeekend, note: null },
  { label: "Awards night", at: SEASON.awards, note: null },
];

export const SCHEDULE_SQL = `create table if not exists schedule (id bigserial primary key, title text not null check (char_length(title) between 2 and 60), starts_at timestamptz not null, note text, on_home boolean not null default true, created_at timestamptz not null default now()); alter table schedule enable row level security;`;

export async function allScheduled(): Promise<Scheduled[]> {
  const { data, error } = await db().from("schedule").select("id,title,starts_at,note,on_home").order("starts_at");
  if (error) throw error;
  return (data ?? []) as Scheduled[];
}

/** True when the database doesn't have the schedule table yet. */
export async function scheduleMissing() {
  try {
    const { error } = await db().from("schedule").select("id").limit(1);
    return !!error && /schedule|PGRST205|42P01/i.test(`${error.message} ${error.code}`);
  } catch { return false; }
}

/** The next event for the countdown, plus the one after it. */
export async function upcoming(now = Date.now()): Promise<{ next: Milestone; then: Milestone | null; custom: boolean }> {
  const rows = await allScheduled().catch(() => [] as Scheduled[]);
  const shown = rows.filter((r) => r.on_home).map((r) => ({ label: r.title, at: r.starts_at, note: r.note }));
  const list = shown.length ? shown : DEFAULTS;
  const future = list.filter((m) => new Date(m.at).getTime() > now);
  return { next: future[0] ?? list[list.length - 1], then: future[1] ?? null, custom: shown.length > 0 };
}

export const fmtWhen = (at: string, year = false) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}), hour: "2-digit", minute: "2-digit" }).format(new Date(at));
