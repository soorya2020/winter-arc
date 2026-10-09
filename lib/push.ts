import "server-only";
import webpush from "web-push";
import { db } from "./db";

// Phone notifications through the installed app. The site makes its own push keys the
// first time they're needed and keeps them in the database, so there's nothing to set up in Vercel.

export const PUSH_SQL = `create table if not exists push_subscriptions (endpoint text primary key, participant_id uuid not null references participants(id) on delete cascade, p256dh text not null, auth text not null, created_at timestamptz not null default now()); alter table push_subscriptions enable row level security; create table if not exists app_settings (key text primary key, value text not null); alter table app_settings enable row level security;`;

type Keys = { publicKey: string; privateKey: string };
let cached: Keys | null = null;

export async function pushKeys(): Promise<Keys | null> {
  if (cached) return cached;
  const { data, error } = await db().from("app_settings").select("value").eq("key", "vapid").maybeSingle();
  if (error) return null;
  if (data?.value) return (cached = JSON.parse(data.value) as Keys);
  const fresh = webpush.generateVAPIDKeys();
  // Two requests at once could both generate keys; the first insert wins and both re-read it.
  await db().from("app_settings").insert({ key: "vapid", value: JSON.stringify(fresh) });
  const again = await db().from("app_settings").select("value").eq("key", "vapid").maybeSingle();
  return again.data?.value ? (cached = JSON.parse(again.data.value) as Keys) : null;
}

export async function pushMissing() {
  try {
    const { error } = await db().from("push_subscriptions").select("endpoint").limit(1);
    return !!error;
  } catch { return false; }
}

export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function saveSubscription(participantId: string, sub: PushSub) {
  const { error } = await db().from("push_subscriptions").upsert({ endpoint: sub.endpoint, participant_id: participantId, p256dh: sub.keys.p256dh, auth: sub.keys.auth });
  if (error) throw error;
}

export async function removeSubscription(endpoint: string) {
  await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
}

/** Who has notifications on (participant ids). */
export async function pushedPeople(): Promise<Set<string>> {
  const { data } = await db().from("push_subscriptions").select("participant_id");
  return new Set((data ?? []).map((r: { participant_id: string }) => r.participant_id));
}

export type Note = { title: string; body: string; url?: string; tag?: string };

/** Sends to every phone a person turned notifications on for. Returns how many got it. */
export async function pushTo(participantId: string, note: Note) {
  const keys = await pushKeys();
  if (!keys) return 0;
  const { data } = await db().from("push_subscriptions").select("*").eq("participant_id", participantId);
  let ok = 0;
  for (const s of (data ?? []) as { endpoint: string; p256dh: string; auth: string }[]) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(note),
        { vapidDetails: { subject: "mailto:winter-arc@example.com", ...keys }, TTL: 60 * 60 * 12 });
      ok++;
    } catch (e) {
      // The phone unsubscribed or the app was removed: forget it.
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await removeSubscription(s.endpoint);
    }
  }
  return ok;
}
