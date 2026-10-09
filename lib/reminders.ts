import "server-only";
import { emailLayout, esc, sendMail, siteUrl } from "./email";
import { displayName, type Participant } from "./db";
import { loadBoard } from "./board";
import { SEASON, WEEK_PLAN, nextMilestone } from "./season.ts";
import { weekday } from "./streak.ts";
import { quoteOfTheDay } from "./quotes";

export const inviteLink = (p: Participant) => `${siteUrl()}/i/${p.token}`;

export async function sendInvite(p: Participant) {
  const first = p.name.split(" ")[0];
  const link = inviteLink(p);
  await sendMail(
    p.email,
    `${first}, you've been picked for Winter Arc`,
    emailLayout({
      kicker: "Invite only · 7 spots",
      title: `${first}, you're in the arc`,
      body: [
        `${esc(first)}, you've been hand-picked for <b>${esc(SEASON.name)}</b>: six events, two weekends and twelve weeks to find out where your limits really are.`,
        "Scoring is capped so nobody's specialty runs away with it. Every kilometre and every rep counts.",
        "Tap below to claim your spot and pick your leaderboard name.",
      ],
      cta: { label: "Claim my spot", href: link },
    }),
    `${first}, you've been picked for ${SEASON.name}. Claim your spot: ${link}`,
  );
}

const daysUntil = (iso: string, now = new Date()) => Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / 86400000));

/** Sends today's reminder to everyone who accepted. Returns how many went out. */
export async function sendDailyReminders(people: Participant[]) {
  const board = await loadBoard();
  const plan = WEEK_PLAN[weekday()];
  const ms = nextMilestone();
  const days = daysUntil(ms.at);
  const quote = await quoteOfTheDay();
  const quoteHtml = `<span style="display:block;border-left:4px solid #ff4d00;padding-left:12px;font-weight:700">“${esc(quote.text)}”${quote.author ? `<br><span style="font-weight:400;color:#6b6f68">${esc(quote.author)}</span>` : ""}</span>`;
  let sent = 0;
  const failed: string[] = [];
  for (const p of people.filter((x) => x.accepted_at)) {
    const row = board.find((r) => r.id === p.id);
    const name = displayName(p).split(" ")[0];
    const streakLine = row?.streak
      ? `You're on a <b>${row.streak}-day streak</b>. Log today's session to keep it alive.`
      : "Your streak is at zero. One session today starts it again.";
    try {
      await sendMail(
        p.email,
        `${days} days to ${ms.label.toLowerCase()} · today: ${plan.title}`,
        emailLayout({
          kicker: `${ms.label} in ${days} days`,
          title: `Today: ${plan.title}`,
          stats: [[String(days), "days left"], [String(row?.streak ?? 0), "day streak"], [row ? `#${row.rank}` : "–", "your rank"]],
          body: [`${esc(name)}, ${esc(plan.detail)}`, streakLine, quoteHtml],
          cta: { label: "Log it", href: `${siteUrl()}/board` },
        }),
        `${days} days to ${ms.label}. Today: ${plan.title}. ${plan.detail}\n\n"${quote.text}"${quote.author ? ` (${quote.author})` : ""}\n\nLog it: ${siteUrl()}/board`,
      );
      sent++;
    } catch {
      failed.push(p.email);
    }
  }
  return { sent, failed };
}

export type Audience = "accepted" | "pending" | "all";

/** Sends an organiser update. Plain text in, paragraphs out; each person gets their own email. */
export async function sendBroadcast(people: Participant[], audience: Audience, subject: string, message: string) {
  const list = people.filter((p) => audience === "all" ? true : audience === "accepted" ? !!p.accepted_at : !p.accepted_at);
  const paras = message.split(/\n{2,}/).map((t) => t.trim()).filter(Boolean);
  let sent = 0;
  const failed: string[] = [];
  for (const p of list) {
    const first = displayName(p).split(" ")[0];
    const href = p.accepted_at ? `${siteUrl()}/board` : inviteLink(p);
    try {
      await sendMail(
        p.email,
        subject,
        emailLayout({
          kicker: "Update from the organisers",
          title: subject,
          body: [`Hey ${esc(first)},`, ...paras.map((t) => esc(t).replace(/\n/g, "<br>"))],
          cta: { label: p.accepted_at ? "Open the arena" : "Claim my spot", href },
        }),
        `Hey ${first},\n\n${paras.join("\n\n")}\n\n${href}`,
      );
      sent++;
    } catch {
      failed.push(p.email);
    }
  }
  return { sent, failed };
}
