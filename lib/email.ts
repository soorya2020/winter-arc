import "server-only";
import nodemailer from "nodemailer";
import { palette as P } from "./theme";

let transport: nodemailer.Transporter | null = null;

// Settings as typed into Vercel, cleaned up: Gmail shows app passwords as "abcd efgh ijkl mnop",
// and stray spaces or quotes around any value make the login fail.
function smtp() {
  const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
  const user = clean(process.env.SMTP_USER);
  const host = clean(process.env.SMTP_HOST) || (user.endsWith("@gmail.com") || user.endsWith("@googlemail.com") ? "smtp.gmail.com" : "");
  const port = Number(clean(process.env.SMTP_PORT) || 465);
  const pass = clean(process.env.SMTP_PASS).replace(/\s+/g, "");
  const from = clean(process.env.MAIL_FROM) || user;
  return { host, port, user, pass, from };
}

function mailer() {
  if (!transport) {
    const { host, port, user, pass } = smtp();
    const missing = [!host && "SMTP_HOST", !user && "SMTP_USER", !pass && "SMTP_PASS"].filter(Boolean);
    if (missing.length) throw new Error(`Email isn't set up: ${missing.join(", ")} missing in Vercel.`);
    transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, connectionTimeout: 15000, greetingTimeout: 15000 });
  }
  return transport;
}

/** Turns SMTP errors into a sentence an organizer can act on. */
export function mailError(e: unknown) {
  const err = e as { code?: string; responseCode?: number; message?: string };
  const msg = err.message ?? String(e);
  if (err.code === "EAUTH" || err.responseCode === 535 || err.responseCode === 534)
    return "Gmail refused the login. In Vercel, SMTP_USER must be the full Gmail address and SMTP_PASS a 16-letter App Password (not your normal password), then redeploy.";
  if (err.code === "ETIMEDOUT" || err.code === "ECONNECTION" || err.code === "ESOCKET" || err.code === "EDNS")
    return `Couldn't reach the mail server (${err.code}). Use SMTP_HOST smtp.gmail.com and SMTP_PORT 465, then redeploy.`;
  if (err.code === "EENVELOPE") return `The address was rejected: ${msg}`;
  return msg;
}

/** Logs in to the mail server and sends a test to the organizer's own inbox. */
export async function mailCheck() {
  const { host, port, user, from } = smtp();
  await mailer().verify();
  const info = await mailer().sendMail({ from, to: user, subject: "Winter Arc test email", text: "If you can read this, invite emails work. Check that the invite lands in the inbox, not spam.", html: "<p>If you can read this, <b>invite emails work</b>.</p><p>Check that invites land in the inbox, not spam.</p>" });
  return { host, port, user, from, accepted: (info.accepted ?? []).map(String), rejected: (info.rejected ?? []).map(String) };
}

// On Vercel, use the project's real production address so links can't point at the wrong site.
export const siteUrl = () => {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (vercel ? `https://${vercel}` : process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
};

export async function sendMail(to: string, subject: string, html: string, text: string) {
  const info = await mailer().sendMail({ from: smtp().from, to, subject, html, text });
  if (info.rejected?.length) throw new Error(`The mail server rejected ${info.rejected.join(", ")}.`);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Bold, table-based email that renders in Gmail and Outlook. */
export function emailLayout(opts: { kicker: string; title: string; body: string[]; cta?: { label: string; href: string }; stats?: [string, string][] }) {
  const stats = opts.stats?.length
    ? `<tr><td style="padding:8px 32px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${opts.stats
        .map(([v, l]) => `<td style="background:${P.paper};border-radius:12px;padding:14px;text-align:center"><div style="font:900 28px Impact,Arial Black,Arial,sans-serif;color:${P.accent}">${esc(v)}</div><div style="font:600 11px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:${P.muted}">${esc(l)}</div></td>`)
        .join('<td width="8"></td>')}</tr></table></td></tr>`
    : "";
  const cta = opts.cta
    ? `<tr><td style="padding:24px 32px 8px"><a href="${esc(opts.cta.href)}" style="display:inline-block;background:${P.ink};color:${P.onInk};font:900 15px Impact,Arial Black,Arial,sans-serif;text-transform:uppercase;text-decoration:none;padding:14px 26px;border-radius:999px">${esc(opts.cta.label)} →</a></td></tr>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:${P.paper}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${P.paper}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:${P.surface};border-radius:20px;overflow:hidden">
<tr><td style="height:8px;background:${P.accent}"></td></tr>
<tr><td style="padding:28px 32px 0;font:600 12px Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;color:${P.accent}">${esc(opts.kicker)}</td></tr>
<tr><td style="padding:10px 32px 0;font:900 32px/1.05 Impact,Arial Black,Arial,sans-serif;text-transform:uppercase;color:${P.ink}">${esc(opts.title)}</td></tr>
${stats}
${opts.body.map((p) => `<tr><td style="padding:16px 32px 0;font:16px/1.6 Arial,sans-serif;color:${P.ink}">${p}</td></tr>`).join("")}
${cta}
<tr><td style="padding:28px 32px;font:12px Arial,sans-serif;color:${P.muted}">Winter Arc · invite only. You're getting this because you were picked.</td></tr>
</table></td></tr></table></body></html>`;
}

export { esc };
