"use server";
import { revalidatePath } from "next/cache";
import { adminLogin, adminLogout, newToken, requireAdmin } from "@/lib/auth";
import { allParticipants, db, type Participant } from "@/lib/db";
import { sendBroadcast, sendDailyReminders, sendInvite, type Audience } from "@/lib/reminders";
import { EVENTS } from "@/lib/season.ts";
import { mailCheck, mailError } from "@/lib/email";
import { DEFAULTS } from "@/lib/schedule";
import { pushTo, pushedPeople } from "@/lib/push";
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
    return { error: `Email failed. ${mailError(e)}` };
  }
  await db().from("participants").update({ invited_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin");
  return { ok: `Invite sent to ${data.email}.` };
}

// Dates are typed in India time; stored as an exact moment.
const istMoment = (date: string, time: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${date}T${time}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export async function saveSchedule(_: Msg, form: FormData): Promise<Msg> {
  requireAdmin();
  const id = Number(form.get("id") || 0);
  const title = String(form.get("title") ?? "").trim().slice(0, 60);
  const note = String(form.get("note") ?? "").trim().slice(0, 140) || null;
  const at = istMoment(String(form.get("date") ?? ""), String(form.get("time") ?? "") || "07:00");
  if (title.length < 2) return { error: "Give the event a name." };
  if (!at) return { error: "Pick a date and time." };
  const row = { title, starts_at: at, note, on_home: form.get("on_home") === "on" };
  const { error } = id ? await db().from("schedule").update(row).eq("id", id) : await db().from("schedule").insert(row);
  if (error) return { error: /schedule/i.test(error.message) ? "The schedule table isn't in the database yet. Run the one line shown above in Supabase first." : "Couldn't save it. Try again." };
  revalidatePath("/admin"); revalidatePath("/"); revalidatePath("/board");
  return { ok: id ? `Updated ${title}.` : `Scheduled ${title}.` };
}

export async function removeSchedule(id: number) {
  requireAdmin();
  await db().from("schedule").delete().eq("id", id);
  revalidatePath("/admin"); revalidatePath("/"); revalidatePath("/board");
}

export async function toggleSchedule(id: number, onHome: boolean) {
  requireAdmin();
  await db().from("schedule").update({ on_home: onHome }).eq("id", id);
  revalidatePath("/admin"); revalidatePath("/"); revalidatePath("/board");
}

export async function importSeasonDates(): Promise<Msg> {
  requireAdmin();
  const { error } = await db().from("schedule").insert(DEFAULTS.map((d) => ({ title: d.label, starts_at: d.at, on_home: true })));
  if (error) return { error: "Couldn't copy them. Is the schedule table set up?" };
  revalidatePath("/admin");
  return { ok: "Copied. Edit them below." };
}

export async function testPush(): Promise<Msg> {
  requireAdmin();
  const ids = [...(await pushedPeople().catch(() => new Set<string>()))];
  if (!ids.length) return { error: "Nobody has turned on notifications yet. Each member taps Turn on in their arena page." };
  let n = 0;
  for (const id of ids) n += (await pushTo(id, { title: "Winter Arc test 🔔", body: "If you see this, daily reminders will reach you here.", url: "/board", tag: "test" })) ? 1 : 0;
  return { ok: `Sent a test notification to ${n} of ${ids.length} people.` };
}

export async function testEmail(): Promise<Msg> {
  requireAdmin();
  try {
    const r = await mailCheck();
    return { ok: `Logged in to ${r.host} as ${r.user} and sent a test to ${r.accepted.join(", ") || r.user}. Check that inbox, and the Spam folder too.` };
  } catch (e) {
    return { error: mailError(e) };
  }
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
    const { sent, pushed, failed } = await sendDailyReminders(await allParticipants());
    const done = `${pushed} by notification, ${sent} by email`;
    return failed.length ? { error: `Sent ${done}. Email failed for: ${failed.join(", ")}` } : { ok: `Sent today's reminder: ${done}.` };
  } catch (e) {
    return { error: `Email failed. ${mailError(e)}` };
  }
}

export async function broadcast(audience: Audience, subject: string, message: string, testOnly: boolean): Promise<Msg> {
  requireAdmin();
  subject = subject.trim().slice(0, 120);
  message = message.trim().slice(0, 5000);
  if (!subject || !message) return { error: "Add a subject and a message." };
  if (!["accepted", "pending", "all"].includes(audience)) return { error: "Pick who should get it." };
  try {
    if (testOnly) {
      const to = process.env.SMTP_USER;
      if (!to) return { error: "SMTP_USER isn't set, so there's nowhere to send a test." };
      const me = { id: "test", name: "Organiser", email: to, nickname: null, catchphrase: null, profile: null, token: "test", accepted_at: new Date().toISOString(), invited_at: null, created_at: "" };
      await sendBroadcast([me], "accepted", `[Test] ${subject}`, message);
      return { ok: `Test sent to ${to}.` };
    }
    const { sent, failed } = await sendBroadcast(await allParticipants(), audience, subject, message);
    if (!sent && !failed.length) return { error: "Nobody matches that group yet." };
    return failed.length ? { error: `Sent ${sent}. Failed for: ${failed.join(", ")}` } : { ok: `Sent to ${sent} ${sent === 1 ? "person" : "people"}.` };
  } catch (e) {
    return { error: `Email failed. ${mailError(e)}` };
  }
}

export async function addQuote(_: Msg, form: FormData): Promise<Msg> {
  requireAdmin();
  const text = String(form.get("text") ?? "").replace(/\s+/g, " ").trim().slice(0, 220);
  const author = String(form.get("author") ?? "").trim().slice(0, 40) || null;
  if (text.length < 3) return { error: "Write the quote first." };
  const { error } = await db().from("quotes").insert({ text, author });
  if (error) return { error: "Couldn't save it. Try again." };
  revalidatePath("/admin");
  return { ok: "Added to the rotation." };
}

export async function removeQuote(id: number) {
  requireAdmin();
  await db().from("quotes").delete().eq("id", id);
  revalidatePath("/admin");
}
