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

// Apple's push service rejects placeholder contacts like example.com, so name a real one.
const subject = () => {
  const mail = process.env.SMTP_USER?.trim();
  if (mail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return `mailto:${mail}`;
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return host ? `https://${host}` : "mailto:winter-arc@winterarc.app";
};

export type PushResult = { sent: number; phones: number; problem?: string };

/** Sends to every phone a person turned notifications on for, and says why if none got it. */
export async function pushReport(participantId: string, note: Note): Promise<PushResult> {
  const keys = await pushKeys();
  if (!keys) return { sent: 0, phones: 0, problem: "Push keys couldn't be read from the database." };
  const { data, error } = await db().from("push_subscriptions").select("*").eq("participant_id", participantId);
  if (error) return { sent: 0, phones: 0, problem: `Couldn't read subscriptions: ${error.message}` };
  const subs = (data ?? []) as { endpoint: string; p256dh: string; auth: string }[];
  let sent = 0;
  let problem: string | undefined;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(note),
        { vapidDetails: { subject: subject(), ...keys }, TTL: 60 * 60 * 12 });
      sent++;
    } catch (e) {
      const err = e as { statusCode?: number; body?: string; message?: string };
      const code = err.statusCode;
      problem = `${code ?? "network"}: ${(err.body || err.message || "").toString().trim().slice(0, 160)}`;
      console.error("push failed", s.endpoint.slice(0, 60), problem);
      // 404/410: the phone unsubscribed or the app was removed. 401/403: the subscription was made
      // with different push keys and can never work. Either way forget it so the phone re-subscribes.
      if (code === 404 || code === 410 || code === 401 || code === 403) await removeSubscription(s.endpoint);
    }
  }
  return { sent, phones: subs.length, problem };
}

/** Sends to every phone a person turned notifications on for. Returns how many got it. */
export async function pushTo(participantId: string, note: Note) {
  return (await pushReport(participantId, note)).sent;
}
