import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./profile.ts";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    // People often paste the REST URL; the client wants just https://<project>.supabase.co.
    const url = process.env.SUPABASE_URL?.trim().replace(/\/(rest\/v1\/?)?$/, "").replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    // Never let Next.js cache database reads: scores and taunts change constantly.
    client = createClient(url, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          // Supabase's newer sb_secret_ keys go in the apikey header only, never as a Bearer token.
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_")) headers.delete("Authorization");
          return fetch(input, { ...init, headers, cache: "no-store" });
        },
      },
    });
  }
  return client;
}

export type Participant = {
  id: string;
  name: string;
  email: string;
  nickname: string | null;
  catchphrase: string | null;
  profile: Profile | null;
  token: string;
  accepted_at: string | null;
  invited_at: string | null;
  password_hash?: string | null;
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

export type Taunt = { id: number; participant_id: string; target_id: string | null; text: string; created_at: string };

export async function recentTaunts(limit = 25) {
  const { data, error } = await db().from("taunts").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Taunt[];
}
