import Link from "next/link";
import Header from "@/components/Header";
import { isAdmin } from "@/lib/auth";
import { allParticipants, allResults, displayName } from "@/lib/db";
import { inviteLink } from "@/lib/reminders";
import { siteUrl } from "@/lib/email";
import { AWARDS, CATEGORIES, EVENTS } from "@/lib/season.ts";
import { formatValue, points } from "@/lib/scoring.ts";
import { loadBoard } from "@/lib/board";
import { allQuotes, quoteOfTheDay } from "@/lib/quotes";
import { AddForm, QuoteForm, RemoveQuote, Broadcast, InviteControls, LoginForm, ReminderButton, RemoveButton, ResultCell, TestEmailButton, TestPushButton, ScheduleForm, ScheduleActions, ImportSeasonDates, CloseRequest, BonusForm, RemoveBonus } from "./ui";
import { BONUS_SQL, allBonuses, bonusMissing } from "@/lib/bonus";
import { HABITS_SQL, openRequests, streakBoard } from "@/lib/habits";
import { logout } from "./actions";
import { passwordColumnMissing, setupProblems } from "@/lib/health";
import { DEFAULTS, SCHEDULE_SQL, allScheduled, fmtWhen, scheduleMissing, upcoming } from "@/lib/schedule";
import { TZ } from "@/lib/season.ts";
import { PUSH_SQL, pushMissing, pushedPeople } from "@/lib/push";

export const dynamic = "force-dynamic";

// Phone first: a bottom tab bar (top row on wide screens), cards instead of wide tables,
// and results entered one event at a time with big number boxes.
const ICONS: Record<string, React.ReactNode> = {
  people: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  results: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M10 2h4" /><path d="M12 2v3" /></>,
  schedule: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M8 15h3" /></>,
  broadcast: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>,
  quotes: <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />,
  awards: <><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" /></>,
};
const TABS = [
  { id: "people", label: "People" },
  { id: "results", label: "Results" },
  { id: "schedule", label: "Events" },
  { id: "broadcast", label: "Message" },
  { id: "quotes", label: "Bro talk" },
  { id: "awards", label: "Awards" },
];
// Result entry: one tab per event-day category, then baseline and bonus.
const GROUPS = [
  ...CATEGORIES.map((c) => ({ id: c.id as string, label: c.short })),
  { id: "baseline", label: "Baseline" },
  { id: "bonus", label: "Bonus" },
];
// Old links (?tab=running, ?w=running) still land on the right group.
const OLD: Record<string, string> = { running: "explosive", strength: "strength", baseline: "baseline" };

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
  const [noPush, pushOn] = tab === "people" || tab === "broadcast" ? await Promise.all([pushMissing(), pushedPeople().catch(() => new Set<string>())]) : [false, new Set<string>()];
  const requests = tab === "people" ? await openRequests() : { list: [], missing: false };
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
      <nav className="anav" aria-label="Admin sections" style={{ ["--i" as string]: TABS.findIndex((t) => t.id === tab) }}>
        <i className="anav-ind" aria-hidden="true" />
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin?tab=${t.id}`} className={t.id === tab ? "on" : ""} aria-current={t.id === tab ? "page" : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[t.id]}</svg><span>{t.label}</span>
          </Link>
        ))}
      </nav>

      {tab === "people" && (
        <div className="adm-body">
          <div className="adm-stats">
            <div><b>{counts.accepted}</b><span>In</span></div>
            <div><b>{counts.invited}</b><span>Invited</span></div>
            <div><b>{counts.waiting}</b><span>Not sent</span></div>
          </div>
          {requests.missing && (
            <div className="panel adm-card adm-alert">
              <b>Quick log and requests need a database update</b>
              <p className="note">Members' floating + button (daily habits and requests to you) needs two new tables. In Supabase, open SQL Editor, paste this and press Run:</p>
              <code className="adm-code">{HABITS_SQL}</code>
            </div>
          )}
          {requests.list.length > 0 && (
            <div className="panel adm-card">
              <b>Requests from members ({requests.list.length})</b>
              <ul className="adm-reqs">
                {requests.list.map((r) => {
                  const who = people.find((p) => p.id === r.participant_id);
                  return (
                    <li key={r.id}>
                      <div><p>{r.text}</p><span className="note">{who ? displayName(who) : "Someone"} · {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ })}</span></div>
                      <CloseRequest id={r.id} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
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
                  <span className="adm-tags">{p.profile?.installedAt && <span className="tag" title="App installed">📲</span>}{pushOn.has(p.id) && <span className="tag" title="Notifications on">🔔</span>}{p.profile?.lockedInAt && <span className="tag on" title="Locked in">🔒</span>}<span className={`tag${p.accepted_at ? " on" : ""}`}>{p.accepted_at ? "In" : p.invited_at ? "Invited" : "Not sent"}</span></span>
                </div>
                <div className="adm-actions">
                  <InviteControls id={p.id} name={p.name} link={inviteLink(p)} sent={!!p.invited_at} />
                  {p.accepted_at && !p.profile?.lockedInAt && <a className="btn ghost small nudge" href={`https://wa.me/?text=${encodeURIComponent(`${p.name.split(" ")[0]} machane, gear up cheyyu 🔒 Open Winter Arc, install the app and turn on notifications. 2 minutes. No excuses: ${siteUrl()}/board#gear`)}`} target="_blank" rel="noopener">Nudge to gear up</a>}
                  <RemoveButton id={p.id} name={p.name} />
                </div>
              </li>
            ))}
            {!people.length && <li className="note">No one yet. Add your first invitee above.</li>}
          </ul>
          <div className="panel adm-card">
            <b>Phone notifications</b>
            {noPush
              ? <><p className="note">Daily reminders can go to phones as notifications instead of email. The database needs one update first. In Supabase, open SQL Editor, paste this and press Run:</p><code className="adm-code">{PUSH_SQL}</code></>
              : <><p className="note"><b>{pushOn.size}</b> of {counts.accepted} have them on, <b>{accepted.filter((p) => p.profile?.lockedInAt).length}</b> fully Locked In 🔒. Members tap "Turn on" in their arena page (on iPhone, after adding Winter Arc to the home screen). Everyone else still gets the email.</p><TestPushButton /></>}
          </div>
          <div className="panel adm-card">
            <b>Email check</b>
            <p className="note">Invites not arriving? This logs in to Gmail with the settings in Vercel and sends a test to your own address, then tells you exactly what went wrong.</p>
            <TestEmailButton />
          </div>
          <div className="panel adm-card">
            <b>Daily reminder</b>
            <p className="note">Goes out by itself at 6:00 IST to everyone who's in. Tap to send today's now.</p>
            <ReminderButton />
          </div>
        </div>
      )}

      {tab === "results" && (() => {
        const w = (GROUPS.find((x) => x.id === (OLD[asked] ?? OLD[searchParams.w ?? ""] ?? searchParams.w)) ?? GROUPS[0]).id;
        const seg = (
          <div className="seg wrap" role="group" aria-label="Category">
            {GROUPS.map((x) => <Link key={x.id} href={`/admin?tab=results&w=${x.id}`} className={x.id === w ? "on" : ""}>{x.label}</Link>)}
          </div>
        );
        if (w === "bonus") return <BonusPoints seg={seg} people={accepted.map((p) => ({ id: p.id, name: displayName(p) }))} />;
        const baseline = w === "baseline";
        const evs = baseline ? EVENTS : EVENTS.filter((e) => e.category === w);
        const ev = evs.find((e) => e.id === searchParams.ev) ?? evs[0];
        const done = accepted.filter((p) => results.some((x) => x.participant_id === p.id && x.event_id === ev.id && x.baseline === baseline)).length;
        return (
          <div className="adm-body">
            {seg}
            <div className="chips-row" role="group" aria-label="Event">
              {evs.map((e) => <Link key={e.id} href={`/admin?tab=results&w=${w}&ev=${e.id}`} className={e.id === ev.id ? "on" : ""}>{e.name}</Link>)}
            </div>
            <div className="adm-ev">
              <div><h2>{ev.name}</h2><p className="note">{ev.rule}{ev.scoring.kind === "tba" ? ". Enter results anyway; they score once the rule is set." : ""}</p></div>
              <span className="adm-done"><b>{done}</b>/{accepted.length} in</span>
            </div>
            <p className="note">Type each result and tap Next on the keyboard to jump to the next person. It saves by itself. {ev.unit.startsWith("time (mm") ? "Times as 15:30. " : ev.unit.startsWith("time") ? "Times in seconds, like 14.2. " : ""}Clear a box to remove a result.{baseline ? " Baseline doesn't count toward the total; it powers Under Dog to Beast." : ""}</p>
            <ul className="adm-entry">
              {accepted.map((p) => {
                const r = results.find((x) => x.participant_id === p.id && x.event_id === ev.id && x.baseline === baseline);
                return (
                  // Keyed by event too, so switching events gives each box a fresh
                  // state instead of keeping the last event's typed value.
                  <li key={`${p.id}-${ev.id}-${baseline}`}>
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
          <p className="note">Send the group an update: as a pop-up notification on their phones, or as an email.</p>
          <Broadcast pushOn={pushOn.size} counts={{ accepted: accepted.length, pending: people.length - accepted.length, all: people.length }} />
        </div>
      )}

      {tab === "schedule" && <Schedule />}

      {tab === "quotes" && <Quotes />}

      {tab === "awards" && <Awards />}
    </div>
  );
}

async function BonusPoints({ seg, people }: { seg: React.ReactNode; people: { id: string; name: string }[] }) {
  const [missing, list, rows] = await Promise.all([bonusMissing(), allBonuses(), loadBoard()]);
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? "Someone";
  const given = rows.filter((r) => r.bonus);
  return (
    <div className="adm-body">
      {seg}
      <div className="adm-ev"><div><h2>Bonus points</h2><p className="note">Give anyone extra points, or take some away with a minus. They add straight to their total on the leaderboard, on top of event scores.</p></div></div>
      {missing ? (
        <div className="panel adm-alert">
          <h3>One database update needed</h3>
          <p className="note">Bonus points need one new table. In Supabase, open SQL Editor, paste this and press Run, then reload this page:</p>
          <code className="adm-code">{BONUS_SQL}</code>
        </div>
      ) : (
        <>
          {people.length ? <BonusForm people={people} /> : <p className="note">Nobody has accepted their invite yet.</p>}
          {given.length > 0 && (
            <div className="bonus-totals">
              {given.map((r) => <span key={r.id} className="tag on">{r.name} {r.bonus > 0 ? "+" : ""}{r.bonus}</span>)}
            </div>
          )}
          <ul className="adm-list">
            {list.map((b) => (
              <li key={b.id} className="adm-card adm-row">
                <span className={`bonus-pts${b.points < 0 ? " neg" : ""}`}>{b.points > 0 ? "+" : ""}{b.points}</span>
                <div style={{ minWidth: 0 }}><b>{name(b.participant_id)}</b><div className="note">{b.reason ? `${b.reason} · ` : ""}{new Date(b.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ })}</div></div>
                <RemoveBonus id={b.id} />
              </li>
            ))}
            {!list.length && <li className="note">No bonus points given yet.</li>}
          </ul>
        </>
      )}
    </div>
  );
}

async function Awards() {
  const [rows, streaks] = await Promise.all([loadBoard(), streakBoard()]);
  // Everyone tied on the best score shares the title; nobody wins on zero.
  const winners = (score: (r: (typeof rows)[number]) => number | undefined) => {
    const best = Math.max(...rows.map((r) => score(r) ?? 0));
    return best > 0 ? rows.filter((r) => score(r) === best).map((r) => r.name).join(" & ") : null;
  };
  const picks = AWARDS.map((a) => {
    const p = a.pick;
    const name = winners((r) => p.kind === "total" ? r.total : p.kind === "leap" ? r.leap : p.kind === "event" ? r.perEvent[p.id] : r.byCategory[p.id]);
    return [a.title, a.text, name] as const;
  });
  return (
    <div className="adm-body">
      <div className="awards">
        {picks.map(([title, text, name]) => (
          <div key={title} className="award">
            <h3>{title}</h3><p>{name ?? "Not decided yet"}</p><p className="note">{text}</p>
          </div>
        ))}
      </div>
      <ul className="adm-list">
        {rows.map((r) => (
          <li key={r.id} className="adm-card adm-row">
            <span className="adm-rk">{r.rank}</span>
            <div style={{ minWidth: 0 }}><b>{r.name}</b><div className="note">{r.total} pts{r.bonus ? ` · ${r.bonus > 0 ? "+" : ""}${r.bonus} bonus` : ""}</div></div>
            <div className="adm-actions"><Link className="btn ghost" href={`/certificate/${r.id}`}>Certificate</Link><a className="btn ghost" href={`/api/poster/${r.id}`}>Poster</a></div>
          </li>
        ))}
      </ul>
      <p className="note">Group poster for the chat: <a href="/api/poster/board">leaderboard poster</a>. Certificates open as a page you can print or save as PDF.</p>

      <div className="adm-ev"><div><h2>Streaks</h2><p className="note">Daily habits from members&apos; + button. Separate from event points. Longest is the best run so far; members see the same board in Ranks &gt; Streaks.</p></div></div>
      <div className="awards">
        {streaks.map((h) => {
          const best = [...h.rows].sort((a, b) => b.best - a.best || b.current - a.current)[0];
          return <div key={h.id} className="award"><h3>{h.icon} Longest {h.name.toLowerCase()} streak</h3><p>{best?.best ? `${best.name} · ${best.best} days` : "Nobody yet"}</p></div>;
        })}
      </div>
      {streaks.map((h) => (
        <details key={h.id} className="adm-fold" open={h.id === streaks[0]?.id}>
          <summary>{h.icon} {h.name} · {h.rows.length} following</summary>
          <ul className="adm-list">
            {h.rows.map((r, i) => (
              <li key={r.id} className="adm-card adm-row">
                <span className="adm-rk">{i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <b>{r.name}</b>
                  <div className="note">Now {r.current} 🔥 · longest {r.best} · {r.days} days logged{h.unit ? ` · ${r.total} ${h.unit}` : ""}{r.last ? ` · last ${r.last}` : ""}{r.rests ? ` · ${r.rests} rest days` : ""}{r.slippedToday ? " · slipped today" : ""}{r.claim ? (r.claim.days > 1 ? ` · self-reported ${r.claim.days} days on ${r.claim.on}` : ` · auto-counting since ${r.claim.on}`) : ""}</div>
                </div>
              </li>
            ))}
            {!h.rows.length && <li className="note">Nobody follows this one yet.</li>}
          </ul>
        </details>
      ))}
    </div>
  );
}

async function Schedule() {
  const [missing, rows, up] = await Promise.all([scheduleMissing(), allScheduled().catch(() => []), upcoming()]);
  const ist = (at: string) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(at)).map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
  };
  return (
    <div className="adm-body">
      <div className="sched-now">
        <span className="label">Home page countdown right now</span>
        <b>{up.next.label}</b>
        <span className="note">{fmtWhen(up.next.at, true)}{up.custom ? "" : " · built-in date"}</span>
      </div>
      {missing ? (
        <div className="panel adm-alert">
          <h3>One database update needed</h3>
          <p className="note">To schedule events, the database needs one new table. In Supabase, open SQL Editor, paste this and press Run, then reload this page:</p>
          <code>{SCHEDULE_SQL}</code>
        </div>
      ) : (
        <>
          <details className="adm-fold" open={!rows.length}>
            <summary>+ Schedule an event</summary>
            <ScheduleForm />
          </details>
          {!rows.length && (
            <div className="panel adm-card">
              <b>Using the built-in season dates</b>
              <ul className="sched-defaults">{DEFAULTS.map((d) => <li key={d.label}><b>{d.label}</b> · {fmtWhen(d.at, true)}</li>)}</ul>
              <p className="note">Copy them into the schedule to move or rename them, or just add your own events above.</p>
              <ImportSeasonDates />
            </div>
          )}
          <ul className="adm-list">
            {rows.map((r) => {
              const past = new Date(r.starts_at).getTime() < Date.now();
              const isNext = up.custom && r.title === up.next.label && r.starts_at === up.next.at;
              return (
                <li key={r.id} className={`adm-card sched-item${past ? " past" : ""}`}>
                  <div className="adm-card-top">
                    <div style={{ minWidth: 0 }}><b>{r.title}</b><div className="note">{fmtWhen(r.starts_at, true)}{r.note ? ` · ${r.note}` : ""}</div></div>
                    <span className={`tag${isNext ? " on" : ""}`}>{isNext ? "Counting down" : past ? "Done" : r.on_home ? "On home" : "Hidden"}</span>
                  </div>
                  <div className="adm-actions"><ScheduleForm edit={{ id: r.id, title: r.title, note: r.note, on_home: r.on_home, ...ist(r.starts_at) }} /><ScheduleActions id={r.id} onHome={r.on_home} /></div>
                </li>
              );
            })}
          </ul>
        </>
      )}
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
