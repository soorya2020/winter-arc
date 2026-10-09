import "server-only";
import { db } from "./db";

// Plain-language setup checks shown to the organiser when the admin panel can't load.

const has = (k: string) => !!process.env[k]?.trim();

/** Which Supabase key was pasted, read from the key itself. */
function keyKind(key: string) {
  if (key.startsWith("sb_secret_")) return "secret";
  if (key.startsWith("sb_publishable_")) return "publishable";
  try {
    const role = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString()).role;
    return role === "service_role" ? "service_role" : role === "anon" ? "anon" : "unknown";
  } catch { return "unknown"; }
}

export async function setupProblems(): Promise<string[]> {
  const out: string[] = [];
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_PASSWORD", "SESSION_SECRET", "SITE_URL", "SMTP_USER", "SMTP_PASS"].filter((k) => !has(k));
  if (missing.length) out.push(`These settings are missing in Vercel: ${missing.join(", ")}. Add them under Settings > Environment Variables, then redeploy.`);

  const url = process.env.SUPABASE_URL?.trim().replace(/\/(rest\/v1\/?)?$/, "").replace(/\/+$/, "") ?? "";
  if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) && !url.startsWith("http://127.0.0.1"))
    out.push(`SUPABASE_URL should look like https://abcdefgh.supabase.co with nothing after .co. Yours is "${url}". Copy the Project URL from Supabase > Project Settings > Data API.`);

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const kind = key ? keyKind(key) : null;
  if (kind === "anon" || kind === "publishable")
    out.push("SUPABASE_SERVICE_ROLE_KEY is the public key, not the secret one. In Supabase > Project Settings > API Keys, open the Legacy tab and copy the service_role key (press Reveal).");
  if (key && /\s/.test(key)) out.push("SUPABASE_SERVICE_ROLE_KEY has a space or line break in it. Paste it again as one line.");

  if (url && key) {
    try {
      const { error } = await db().from("participants").select("id").limit(1);
      if (error) {
        const msg = `${error.message ?? ""} ${error.code ?? ""}`;
        if (/relation .* does not exist|PGRST205|42P01/i.test(msg)) out.push("The database tables don't exist yet. In Supabase, open SQL Editor, paste supabase/schema.sql from the repo and press Run.");
        else if (/invalid api key|jwt|401|unauthor/i.test(msg)) out.push("Supabase rejected the key. Copy the service_role key again from Supabase > Project Settings > API Keys > Legacy, paste it in Vercel and redeploy.");
        else out.push(`Supabase said: ${error.message}`);
      }
    } catch (e) {
      out.push(`Couldn't reach Supabase (${e instanceof Error ? e.message : "unknown error"}). Check SUPABASE_URL.`);
    }
  }
  return out;
}
