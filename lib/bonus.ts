import "server-only";
import { db } from "./db";

// Custom points the organizer hands out from Admin > Results > Bonus. Each award adds to
// (or, when negative, takes from) the member's total on the leaderboard.

export type Bonus = { id: number; participant_id: string; points: number; reason: string | null; created_at: string };

export const BONUS_SQL = `create table if not exists bonus_points (id bigserial primary key, participant_id uuid not null references participants(id) on delete cascade, points numeric not null check (points between -1000 and 1000 and points <> 0), reason text, created_at timestamptz not null default now()); alter table bonus_points enable row level security;`;

/** Every award, newest first. Empty when the table isn't set up yet. */
export async function allBonuses(): Promise<Bonus[]> {
  const { data, error } = await db().from("bonus_points").select("id, participant_id, points, reason, created_at").order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((b) => ({ ...b, points: Number(b.points) })) as Bonus[];
}

/** True when the database doesn't have the bonus_points table yet. */
export async function bonusMissing() {
  try {
    const { error } = await db().from("bonus_points").select("id").limit(1);
    return !!error && /bonus_points|PGRST205|42P01/i.test(`${error.message} ${error.code}`);
  } catch { return false; }
}
