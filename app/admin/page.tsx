import Link from "next/link";
import Header from "@/components/Header";
import { isAdmin } from "@/lib/auth";
import { allParticipants, allResults, displayName } from "@/lib/db";
import { inviteLink } from "@/lib/reminders";
import { EVENTS } from "@/lib/season.ts";
import { formatValue, points } from "@/lib/scoring.ts";
import { loadBoard } from "@/lib/board";
import { allQuotes, quoteOfTheDay } from "@/lib/quotes";
import { AddForm, QuoteForm, RemoveQuote, Broadcast, InviteControls, LoginForm, ReminderButton, RemoveButton, ResultCell } from "./ui";
import { logout } from "./actions";
import { passwordColumnMissing, setupProblems } from "@/lib/health";

export const dynamic = "force-dynamic";

// Phone first: a bottom tab bar (top row on wide screens), cards instead of wide tables,
// and results entered one event at a time with big number boxes.
const TABS = [
  { id: "people", label: "People", icon: "👥" },
  { id: "results", label: "Results", icon: "⏱" },
  { id: "broadcast", label: "Email", icon: "✉" },
  { id: "quotes", label: "Bro talk", icon: "💬" },
  { id: "awards", label: "Awards", icon: "🏆" },
];
const WEEKENDS = [
  { id: "running", label: "Running" },
  { id: "strength", label: "Strength" },
  { id: "baseline", label: "Baseline" },
] as const;
// Old links (?tab=running) still land on the right weekend.
const OLD: Record<string, string> = { running: "running", strength: "strength", baseline: "baseline" };

export default async function Admin({ searchParams }: { searchParams: { tab?: string; w?: string; ev?: string } }) {
  if (!isAdmin()) {
    return (
      <div className="wrap">
        <Header />
        <section style={{ maxWidth: "26rem" }}>
          <div className="head"><span className="label">Organizers only</span><h2>Admin</h2></div>
          <LoginForm />
        </section>
      </div>
    );
  }
  const asked = searchParams.tab ?? "people";
  const tab = OLD[asked] ? "results" : TABS.some((t) => t.id === asked) ? asked : "people";
  let people: Awaited<ReturnType<typeof allParticipants>>, results: Awaited<ReturnType<typeof allResults>>;
  try {
    [people, results] = await Promise.all([allParticipants(), allResults()]);
  } catch {
    const problems = await setupProblems();
    return (
      <div className="wrap">
        <Header right={<form action={logout}><button className="ghost small" type="submit">Sign out</button></form>} />
        <section style={{ paddingTop: "1rem", maxWidth: "44rem" }}>
          <div className="head"><span className="label">Organizer panel</span><h2>Almost there</h2>
            <p>You're signed in, but the site can't read the database yet. Fix what's listed below, redeploy in Vercel, then reload this page.</p></div>
          <div className="panel">
            {(problems.length ? problems : ["The database didn't answer. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy."]).map((p) => <p key={p} className="err" style={{ fontWeight: 600 }}>{p}</p>)}
          </div>
        </section>
      </div>
    );
  }
  const accepted = people.filter((p) => p.accepted_at);
  const counts = { accepted: accepted.length, invited: people.filter((p) => !p.accepted_at && p.invited_at).length, waiting: people.filter((p) => !p.invited_at).length };

  return (
    <div className="wrap adm">
      <header className="adm-top">
        <div><span className="label">Organizer panel</span><h1>Run the <em>arc</em></h1></div>
        <div className="adm-links"><Link href="/board">Board</Link><form action={logout}><button className="ghost small" type="submit">Sign out</button></form></div>
      </header>
      {await passwordColumnMissing() && (
        <div className="panel adm-alert">
          <h3>One database update needed</h3>
          <p className="note">Member passwords need one new column. In Supabase, open SQL Editor, paste this line and press Run:</p>
          <code>alter table participants add column if not exists password_hash text;</code>
        </div>
      )}
      <nav className="anav" aria-label="Admin sections">
        {TABS.map((t) => <Link key={t.id} href={`/admin?tab=${t.id}`} className={t.id === tab ? "on" : ""} aria-current={t.id === tab ? "page" : undefined}><span aria-hidden="true">{t.icon}</span>{t.label}</Link>)}
      </nav>

      {tab === "people" && (
        <div className="adm-body">
          <div className="adm-stats">
            <div><b>{counts.accepted}</b><span>In</span></div>
            <div><b>{counts.invited}</b><span>Invited</span></div>
            <div><b>{counts.waiting}</b><span>Not sent</span></div>
          </div>
          <details className="adm-fold">
            <summary>+ Add an invitee</summary>
            <AddForm />
          </details>
          <ul className="adm-list">
            {people.map((p) => (
              <li key={p.id} className="adm-card">
                <div className="adm-card-top">
                  <div style={{ minWidth: 0 }}>
                    <b>{p.name}</b>{p.nickname && p.nickname !== p.name ? <span className="note"> “{p.nickname}”</span> : null}
                    <div className="copy">{p.email}</div>
                  </div>
                  <span className={`tag${p.accepted_at ? " on" : ""}`}>{p.accepted_at ? "In" : p.invited_at ? "Invited" : "Not sent"}</span>
                </div>
                <div className="adm-actions">
                  <InviteControls id={p.id} link={inviteLink(p)} sent={!!p.invited_at} />
                  <RemoveButton id={p.id} name={p.name} />
                </div>
              </li>
            ))}
            {!people.length && <li className="note">No one yet. Add your first invitee above.</li>}
          </ul>
          <div className="panel adm-card">
            <b>Daily reminder</b>
            <p className="note">Goes out by itself at 6:00 IST to everyone who's in. Tap to send today's now.</p>
            <ReminderButton />
          </div>
        </div>
      )}

      {tab === "results" && (() => {
        const w = (WEEKENDS.find((x) => x.id === (OLD[asked] ?? searchParams.w)) ?? WEEKENDS[0]).id;
        const baseline = w === "baseline";
        const evs = baseline ? EVENTS : EVENTS.filter((e) => e.weekend === w);
        const ev = evs.find((e) => e.id === searchParams.ev) ?? evs[0];
        const done = accepted.filter((p) => results.some((x) => x.participant_id === p.id && x.event_id === ev.id && x.baseline === baseline)).length;
        return (
          <div className="adm-body">
            <div className="seg" role="group" aria-label="Weekend">
              {WEEKENDS.map((x) => <Link key={x.id} href={`/admin?tab=results&w=${x.id}`} className={x.id === w ? "on" : ""}>{x.label}</Link>)}
            </div>
            <div className="chips-row" role="group" aria-label="Event">
              {evs.map((e) => <Link key={e.id} href={`/admin?tab=results&w=${w}&ev=${e.id}`} className={e.id === ev.id ? "on" : ""}>{e.name}</Link>)}
            </div>
            <div className="adm-ev">
              <div><h2>{ev.name}</h2><p className="note">{ev.rule}</p></div>
              <span className="adm-done"><b>{done}</b>/{accepted.length} in</span>
            </div>
            <p className="note">Type each result and tap Next on the keyboard to jump to the next person. It saves by itself. {ev.unit.startsWith("time (mm") ? "Times as 15:30. " : ev.unit.startsWith("time") ? "Times in seconds, like 14.2. " : ""}Clear a box to remove a result.{baseline ? " Baseline doesn't count toward the total; it powers Biggest Leap." : ""}</p>
            <ul className="adm-entry">
              {accepted.map((p) => {
                const r = results.find((x) => x.participant_id === p.id && x.event_id === ev.id && x.baseline === baseline);
                return (
                  <li key={p.id}>
                    <b>{displayName(p)}</b>
                    <ResultCell participantId={p.id} eventId={ev.id} baseline={baseline} label={`${displayName(p)}, ${ev.name}`}
                      initial={formatValue(ev, r?.value)} initialPoints={r ? points(ev.scoring, r.value) : null}
                      placeholder={ev.unit.startsWith("time (mm") ? "15:30" : ev.unit.startsWith("time") ? "14.2" : ev.unit} />
                  </li>
                );
              })}
              {!accepted.length && <li className="note">Nobody has accepted their invite yet.</li>}
            </ul>
          </div>
        );
      })()}

      {tab === "broadcast" && (
        <div className="adm-body">
          <p className="note">Write an update and email it to the group in the Winter Arc style. Send yourself a test first to see how it looks.</p>
          <Broadcast counts={{ accepted: accepted.length, pending: people.length - accepted.length, all: people.length }} />
        </div>
      )}

      {tab === "quotes" && <Quotes />}

      {tab === "awards" && <Awards />}
    </div>
  );
}

async function Awards() {
  const rows = await loadBoard();
  const top = (k: "total" | "running" | "strength" | "leap") => [...rows].sort((a, b) => b[k] - a[k])[0];
  const picks = [["Arc Champion", top("total")], ["Iron Lungs", top("running")], ["Steel Core", top("strength")], ["Biggest Leap", top("leap")]] as const;
  return (
    <div className="adm-body">
      <div className="awards">
        {picks.map(([title, r]) => (
          <div key={title} className="award">
            <h3>{title}</h3><p>{r ? r.name : "Not decided yet"}</p>
          </div>
        ))}
      </div>
      <ul className="adm-list">
        {rows.map((r) => (
          <li key={r.id} className="adm-card adm-row">
            <span className="adm-rk">{r.rank}</span>
            <div style={{ minWidth: 0 }}><b>{r.name}</b><div className="note">{r.total} pts</div></div>
            <div className="adm-actions"><Link className="btn ghost" href={`/certificate/${r.id}`}>Certificate</Link><a className="btn ghost" href={`/api/poster/${r.id}`}>Poster</a></div>
          </li>
        ))}
      </ul>
      <p className="note">Group poster for the chat: <a href="/api/poster/board">leaderboard poster</a>. Certificates open as a page you can print or save as PDF.</p>
    </div>
  );
}

async function Quotes() {
  const [list, todayQ] = await Promise.all([allQuotes(), quoteOfTheDay()]);
  return (
    <div className="adm-body">
      <p className="note">One quote shows per day: in a single strip above the arena and at the bottom of the daily email. Friends can add their own from the arena page too.</p>
      <p><span className="label">Showing today</span><br /><b>“{todayQ.text}”</b>{todayQ.author ? ` · ${todayQ.author}` : ""}</p>
      <QuoteForm />
      <ul className="adm-list">
        {list.map((q) => <li key={q.id} className="adm-card adm-row"><div style={{ minWidth: 0 }}>“{q.text}”<div className="note">{q.author ?? "No name"}</div></div><RemoveQuote id={q.id} /></li>)}
        {!list.length && <li className="note">No quotes yet. Three built-in starters rotate until you add the first one.</li>}
      </ul>
    </div>
  );
}
