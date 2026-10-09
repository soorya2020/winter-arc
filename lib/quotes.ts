import "server-only";
import { db } from "./db";
import { today } from "./streak.ts";

export type Quote = { id: number; text: string; author: string | null; participant_id: string | null; created_at: string };

// Used only until the first real quote is added.
const STARTERS: Pick<Quote, "text" | "author">[] = [
  { text: "Nobody's coming to do your push-ups for you, bro.", author: null },
  { text: "Cold outside. Warm excuses. Pick one.", author: null },
  { text: "The plan works if you do. Log it.", author: null },
];

export async function allQuotes() {
  const { data, error } = await db().from("quotes").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []) as Quote[];
}

/** Same quote for everyone all day; moves to the next one at midnight IST. */
export async function quoteOfTheDay(): Promise<Pick<Quote, "text" | "author">> {
  const list = await allQuotes().catch(() => [] as Quote[]);
  const pool = list.length ? list : STARTERS;
  const day = Math.floor(new Date(`${today()}T00:00:00Z`).getTime() / 86400000);
  return pool[day % pool.length];
}
