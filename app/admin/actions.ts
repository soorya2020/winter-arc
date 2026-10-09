"use server";
import { revalidatePath } from "next/cache";
import { adminLogin, adminLogout, newToken, requireAdmin } from "@/lib/auth";
import { allParticipants, db, type Participant } from "@/lib/db";
import { sendDailyReminders, sendInvite } from "@/lib/reminders";
import { EVENTS } from "@/lib/season.ts";
import { parseValue, points } from "@/lib/scoring.ts";

type Msg = { ok?: string; error?: string } | null;

export async function login(_: Msg, form: FormData): Promise<Msg> {
  if (!adminLogin(String(form.get("password") ?? ""))) return { error: "Wrong password." };
  revalidatePath("/admin");
  return { ok: "Signed in." };
}

export async function logout() {
  adminLogout();
  revalidatePath("/admin");
}

export async function addParticipant(_: Msg, form: FormData): Promise<Msg> {
  requireAdmin();
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (name.length < 2) return { error: "Enter their name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right." };
  const { error } = await db().from("participants").insert({ name, email, token: newToken() });
  if (error) return { error: error.code === "23505" ? "That email is already on the list." : "Couldn't add them. Try again." };
  revalidatePath("/admin");
  return { ok: `Added ${name}. Send the invite when you're ready.` };
}

export async function removeParticipant(id: string) {
  requireAdmin();
  await db().from("participants").delete().eq("id", id);
  revalidatePath("/admin");
}

export async function emailInvite(id: string): Promise<Msg> {
  requireAdmin();
  const { data } = await db().from("participants").select("*").eq("id", id).maybeSingle();
  if (!data) return { error: "Participant not found." };
  try {
    await sendInvite(data as Participant);
  } catch (e) {
    return { error: `Email failed: ${(e as Error).message}` };
  }
  await db().from("participants").update({ invited_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin");
  return { ok: `Invite sent to ${data.email}.` };
}

export async function saveResult(participantId: string, eventId: string, baseline: boolean, raw: string): Promise<{ points?: number; error?: string }> {
  requireAdmin();
  const ev = EVENTS.find((e) => e.id === eventId);
  if (!ev) return { error: "Unknown event" };
  const key = { participant_id: participantId, event_id: eventId, baseline };
  if (!raw.trim()) {
    await db().from("results").delete().match(key);
    revalidatePath("/board");
    return {};
  }
  const value = parseValue(raw);
  if (value == null) return { error: "Use a number, or mm:ss for times" };
  const { error } = await db().from("results").upsert({ ...key, value, updated_at: new Date().toISOString() }, { onConflict: "participant_id,event_id,baseline" });
  if (error) return { error: "Couldn't save" };
  revalidatePath("/board");
  return { points: points(ev.scoring, value) };
}

export async function sendRemindersNow(): Promise<Msg> {
  requireAdmin();
  try {
    const { sent, failed } = await sendDailyReminders(await allParticipants());
    return failed.length ? { error: `Sent ${sent}. Failed for: ${failed.join(", ")}` } : { ok: `Sent today's reminder to ${sent} people.` };
  } catch (e) {
    return { error: `Email failed: ${(e as Error).message}` };
  }
}
