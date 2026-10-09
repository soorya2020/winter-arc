import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export type Participant = {
  id: string;
  name: string;
  email: string;
  nickname: string | null;
  token: string;
  accepted_at: string | null;
  invited_at: string | null;
  created_at: string;
};

export const displayName = (p: Pick<Participant, "name" | "nickname">) => p.nickname || p.name;

export async function participantByToken(token: string | undefined | null) {
  if (!token || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const { data } = await db().from("participants").select("*").eq("token", token).maybeSingle();
  return (data as Participant | null) ?? null;
}

export async function allParticipants() {
  const { data, error } = await db().from("participants").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []) as Participant[];
}

export async function allResults() {
  const { data, error } = await db().from("results").select("participant_id, event_id, value, baseline");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, value: Number(r.value) })) as {
    participant_id: string; event_id: string; value: number; baseline: boolean;
  }[];
}

export async function practiceDays() {
  const { data, error } = await db().from("practice_logs").select("participant_id, day");
  if (error) throw error;
  return (data ?? []) as { participant_id: string; day: string }[];
}
