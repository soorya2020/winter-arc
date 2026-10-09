import "server-only";
import nodemailer from "nodemailer";

let transport: nodemailer.Transporter | null = null;

function mailer() {
  if (!transport) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) throw new Error("SMTP settings are missing");
    const port = Number(SMTP_PORT || 465);
    transport = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  }
  return transport;
}

export const siteUrl = () => (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export async function sendMail(to: string, subject: string, html: string, text: string) {
  await mailer().sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html, text });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Bold, table-based email that renders in Gmail and Outlook. */
export function emailLayout(opts: { kicker: string; title: string; body: string[]; cta?: { label: string; href: string }; stats?: [string, string][] }) {
  const stats = opts.stats?.length
    ? `<tr><td style="padding:8px 32px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${opts.stats
        .map(([v, l]) => `<td style="background:#231656;border-radius:12px;padding:14px;text-align:center"><div style="font:900 28px Arial Black,Arial,sans-serif;color:#ffd23f">${esc(v)}</div><div style="font:600 11px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#b9addf">${esc(l)}</div></td>`)
        .join('<td width="8"></td>')}</tr></table></td></tr>`
    : "";
  const cta = opts.cta
    ? `<tr><td style="padding:24px 32px 8px"><a href="${esc(opts.cta.href)}" style="display:inline-block;background:#ff3d8b;color:#fbf8ff;font:900 15px Arial Black,Arial,sans-serif;text-transform:uppercase;text-decoration:none;padding:14px 26px;border-radius:999px">${esc(opts.cta.label)} →</a></td></tr>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#120a2e"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#120a2e"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#1c1145;border-radius:20px;overflow:hidden">
<tr><td style="height:8px;background:linear-gradient(90deg,#ff3d8b,#ffd23f,#2ee6d6)"></td></tr>
<tr><td style="padding:28px 32px 0;font:600 12px Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;color:#2ee6d6">${esc(opts.kicker)}</td></tr>
<tr><td style="padding:10px 32px 0;font:900 32px/1.05 Arial Black,Arial,sans-serif;text-transform:uppercase;color:#fbf8ff">${esc(opts.title)}</td></tr>
${stats}
${opts.body.map((p) => `<tr><td style="padding:16px 32px 0;font:16px/1.6 Arial,sans-serif;color:#e4dcff">${p}</td></tr>`).join("")}
${cta}
<tr><td style="padding:28px 32px;font:12px Arial,sans-serif;color:#8e82b8">Winter Arc · invite only. You're getting this because you were picked.</td></tr>
</table></td></tr></table></body></html>`;
}

export { esc };
