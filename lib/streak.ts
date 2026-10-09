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

/** Consecutive days with a logged session, ending today (or yesterday if today isn't logged yet). */
export function streak(days: string[], now = new Date()) {
  const set = new Set(days);
  let d = today(now);
  if (!set.has(d)) d = prevDay(d);
  let n = 0;
  while (set.has(d)) { n++; d = prevDay(d); }
  return n;
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
