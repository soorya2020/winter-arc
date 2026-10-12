import { TZ } from "./season.ts";

/** Today's date (YYYY-MM-DD) in the season's time zone. */
export function today(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function prevDay(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Consecutive logged days, ending today (or yesterday if today isn't logged yet). */
export function streak(days: string[], now = new Date()) {
  const set = new Set(days);
  let d = today(now);
  if (!set.has(d)) d = prevDay(d);
  let n = 0;
  while (set.has(d)) { n++; d = prevDay(d); }
  return n;
}

/** A member's own "I'm already N days in" for a check habit, set on day `on`. */
export type StreakClaim = { days: number; on: string };

function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Days that count toward a streak. Without a claim, just the logged clean days. With one, the counter
    runs by itself: every day from the claimed start through today counts, restarting the day after a slip.
    Slips logged before the claim was made don't break it: the member's own number is the newer word. */
export function countedDays(good: string[], slips: string[], claim?: StreakClaim | null, now = new Date()) {
  if (!claim || claim.days < 1) return good;
  let from = addDays(claim.on, 1 - claim.days);
  for (const s of [...slips].sort()) if (s >= claim.on && s >= from) from = addDays(s, 1);
  const out = new Set(good);
  for (let d = from, end = today(now); d <= end; d = addDays(d, 1)) out.add(d);
  return [...out];
}

/** Longest run of consecutive days ever. */
export function longest(days: string[]) {
  const sorted = [...new Set(days)].sort();
  let best = 0, run = 0, prev = "";
  for (const d of sorted) {
    run = prev && prevDay(d) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Last `n` days, oldest first, each marked done or not. */
export function lastDays(days: string[], n = 10, now = new Date()) {
  const set = new Set(days);
  const out: boolean[] = [];
  let d = today(now);
  for (let i = 0; i < n; i++) { out.unshift(set.has(d)); d = prevDay(d); }
  return out;
}

/** Day of week (0 = Sunday) in the season's time zone. */
export function weekday(now = new Date()) {
  const d = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(now);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(d);
}
