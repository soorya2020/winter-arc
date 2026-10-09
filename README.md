# Winter Arc

Invite-only site for the Winter Arc fitness competition: landing page, personal invite links,
daily reminder emails, a group arena where everyone's fighter brawls and trash-talks, a live
leaderboard with practice streaks, an admin panel for entering results, certificates and
shareable posters.

Built with Next.js 14, Supabase (database) and any SMTP mailbox (Gmail works). Hosted on Vercel.
All of it fits in free tiers for a group of 7.

## Change the season

Everything about the competition lives in [`lib/season.ts`](lib/season.ts): dates, events,
scoring caps, the weekly training plan, drills and awards. Edit it, push, and the site, emails
and admin panel follow. Scoring rules are tested in `lib/scoring.test.ts` (`npm test`).

Scoring types:
- `per_unit`: points for every unit up to a cap. Long run is 10 pts per km, capped at 10 km.
- `time`: full 100 at or under a target time, minus points per step slower, with a floor for finishing.

Every event is worth 100, so nobody's specialty outweighs the rest.

## Set it up (about 20 minutes, once)

1. **Database (Supabase).** Create a free project at supabase.com. Open *SQL Editor*, paste
   [`supabase/schema.sql`](supabase/schema.sql) and run it. It's safe to run again after updates. From *Project Settings > API*, copy the
   project URL and the `service_role` key.
2. **Email (Gmail).** On the Google account that will send the emails, turn on 2-step verification,
   then create an App Password (myaccount.google.com/apppasswords). Gmail allows about 500 emails
   a day, plenty for 7 people.
3. **Hosting (Vercel).** At vercel.com, *Add New > Project*, import this GitHub repo, and add the
   environment variables from [`.env.example`](.env.example):
   - `SITE_URL`: your Vercel address, e.g. `https://winter-arc.vercel.app`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`: what you'll type to open `/admin`
   - `SESSION_SECRET`, `CRON_SECRET`: any long random strings
   - `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS` (the app password), `MAIL_FROM`
   Deploy.
4. **Run it.** Open `/admin`, sign in, add each invitee's name and email, then press *Email invite*
   (or *Copy link* to send it yourself on WhatsApp). The daily reminder goes out at 6:00 IST to
   everyone who accepted (`vercel.json`, schedule `30 0 * * *` in UTC).

## The arena's trash talk

When people accept their invite they answer a short personality questionnaire (tone, fighter name,
signature move, go-to excuse, guilty snack, hype song, early bird or night owl, and a rival).
Fighters roast each other with those answers plus real stats. Lines live in [`lib/trash.ts`](lib/trash.ts),
questions in [`lib/profile.ts`](lib/profile.ts). Anyone can change their answers at `/profile`.

## Pages

| Page | Who | What |
| --- | --- | --- |
| `/` | Everyone | Landing page. Personal welcome and confetti for invitees. |
| `/i/<token>` | Invitee | Personal invite link. Remembers them and opens the page. |
| `/profile` | Accepted invitees | Edit catchphrase and personality answers. |
| `/board` | Accepted invitees, admin | The arena (group brawl and shared trash talk), live table, practice log, streak. |
| `/admin` | Admin | Participants and invites, result entry per weekend, baseline test, awards. |
| `/certificate/<id>` | That athlete, admin | Printable A4 certificate (print or save as PDF). |
| `/api/poster/<id>` | Invitees, admin | 1080×1350 PNG poster for stories. `/api/poster/board` is the group poster. |

## Develop

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```
