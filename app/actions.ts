"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentParticipant } from "@/lib/auth";
import { db } from "@/lib/db";
import { PRACTICE_KINDS } from "@/lib/season.ts";
import { today } from "@/lib/streak.ts";

export async function acceptInvite(_: unknown, form: FormData) {
  const me = await currentParticipant();
  if (!me) return { error: "Open the invite link from your email first." };
  const nickname = String(form.get("nickname") ?? "").trim().slice(0, 28);
  if (nickname.length < 2) return { error: "Pick a leaderboard name with at least 2 characters." };
  const { error } = await db().from("participants")
    .update({ nickname, accepted_at: me.accepted_at ?? new Date().toISOString() })
    .eq("id", me.id);
  if (error) return { error: "Couldn't save that. Try again." };
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
