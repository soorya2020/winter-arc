"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentParticipant, participantCookie } from "@/lib/auth";
import { cookies } from "next/headers";
import { checkPassword, hashPassword, MIN_PASSWORD } from "@/lib/password";
import { db, type Participant } from "@/lib/db";
import { sendInvite } from "@/lib/reminders";
import { PRACTICE_KINDS } from "@/lib/season.ts";
import { today } from "@/lib/streak.ts";
import { missingPersonal, profileFromForm } from "@/lib/profile.ts";

export async function acceptInvite(_: unknown, form: FormData) {
  const me = await currentParticipant();
  if (!me) return { error: "Open the invite link from your email first." };
  const nickname = String(form.get("nickname") ?? "").trim().slice(0, 28);
  const catchphrase = String(form.get("catchphrase") ?? "").trim().slice(0, 80) || null;
  if (nickname.length < 2) return { error: "Pick a leaderboard name with at least 2 characters." };
  const password = String(form.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return { error: `Pick a password with at least ${MIN_PASSWORD} characters. You'll use it to sign in.` };
  const profile = profileFromForm(form);
  const missing = missingPersonal(profile);
  if (missing) return { error: missing };
  const { error } = await db().from("participants")
    .update({ nickname, catchphrase, profile, password_hash: await hashPassword(password), accepted_at: me.accepted_at ?? new Date().toISOString() })
    .eq("id", me.id);
  if (error) return { error: /password_hash/.test(error.message) ? "The site needs a quick database update first. Ask the organiser." : "Couldn't save that. Try again." };
  revalidatePath("/board");
  redirect("/board?joined=1");
}

export async function logPractice(_: unknown, form: FormData) {
  const me = await currentParticipant();
  if (!me?.accepted_at) return { error: "Accept your invite first." };
  const kind = String(form.get("kind") ?? "");
  const minutes = Math.round(Number(form.get("minutes")));
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || null;
  if (!PRACTICE_KINDS.includes(kind)) return { error: "Pick what you trained." };
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) return { error: "Minutes should be between 1 and 600." };
  const { error } = await db().from("practice_logs").insert({ participant_id: me.id, day: today(), kind, minutes, note });
  if (error) return { error: "Couldn't save that. Try again." };
  revalidatePath("/board");
  return { ok: `Logged ${minutes} min of ${kind.toLowerCase()}. Streak updated.` };
}

export async function postTaunt(text: string, targetId: string | null) {
  const me = await currentParticipant();
  if (!me?.accepted_at) return { error: "Accept your invite first." };
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 120);
  if (!clean) return { error: "Type something first." };
  const { data: last } = await db().from("taunts").select("created_at").eq("participant_id", me.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < 3000) return { error: "Easy, champ. One taunt every few seconds." };
  const { error } = await db().from("taunts").insert({ participant_id: me.id, target_id: targetId, text: clean });
  if (error) return { error: "Couldn't send that. Try again." };
  return { ok: true };
}

export async function saveProfile(_: unknown, form: FormData) {
  const me = await currentParticipant();
  if (!me?.accepted_at) return { error: "Accept your invite first." };
  const catchphrase = String(form.get("catchphrase") ?? "").trim().slice(0, 80) || null;
  const profile = profileFromForm(form);
  if (profile.rivalId === me.id) delete profile.rivalId;
  const missing = missingPersonal(profile);
  if (missing) return { error: missing };
  const password = String(form.get("password") ?? "");
  if (password && password.length < MIN_PASSWORD) return { error: `New password needs at least ${MIN_PASSWORD} characters.` };
  const update: Record<string, unknown> = { catchphrase, profile };
  if (password) update.password_hash = await hashPassword(password);
  const { error } = await db().from("participants").update(update).eq("id", me.id);
  if (error) return { error: "Couldn't save that. Try again." };
  revalidatePath("/board");
  return { ok: "Saved. Your fighter has a new attitude." };
}

export async function submitQuote(_: unknown, form: FormData) {
  const me = await currentParticipant();
  if (!me?.accepted_at) return { error: "Accept your invite first." };
  const text = String(form.get("quote") ?? "").replace(/\s+/g, " ").trim().slice(0, 220);
  if (text.length < 3) return { error: "Write your bro talk first." };
  const { count } = await db().from("quotes").select("id", { count: "exact", head: true }).eq("participant_id", me.id);
  if ((count ?? 0) >= 10) return { error: "That's 10 from you already. Leave some for the others." };
  const { error } = await db().from("quotes").insert({ text, author: me.nickname || me.name, participant_id: me.id });
  if (error) return { error: "Couldn't save it. Try again." };
  return { ok: "Added. It'll show up on one of the coming days." };
}

/** "Lost your link?" Emails the personal link again. Says the same thing whether or not the address is on the list. */
export async function resendLink(_: unknown, form: FormData): Promise<{ ok?: string; error?: string }> {
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  if (!email.includes("@")) return { error: "Enter the email your invite went to." };
  const done = { ok: "If that email is on the list, your personal link is on its way. Check your inbox and spam." };
  const { data } = await db().from("participants").select("*").ilike("email", email).maybeSingle();
  if (!data) return done;
  const p = data as Participant;
  if (p.invited_at && Date.now() - new Date(p.invited_at).getTime() < 60_000) return done;
  try {
    await sendInvite(p);
    await db().from("participants").update({ invited_at: new Date().toISOString() }).eq("id", p.id);
  } catch {
    return { error: "Couldn't send the email right now. Ask the organiser for your link." };
  }
  return done;
}

/** Email and password sign-in. Only people on the invite list who have accepted and set a password get in. */
export async function signIn(_: unknown, form: FormData): Promise<{ error?: string }> {
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(form.get("password") ?? "");
  if (!email.includes("@") || !password) return { error: "Enter your email and password." };
  const { data } = await db().from("participants").select("*").ilike("email", email).maybeSingle();
  const p = data as Participant | null;
  const ok = !!p?.accepted_at && (await checkPassword(password, p.password_hash));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600));
    if (p && !p.password_hash) return { error: "You haven't set a password yet. Use \"Email me a sign-in link\" below, then set one on your profile page." };
    return { error: "That email and password don't match. Only invited members can sign in." };
  }
  cookies().set(participantCookie(p!.token));
  redirect("/board");
}

export async function signOut() {
  cookies().delete("wa_invite");
  redirect("/");
}
