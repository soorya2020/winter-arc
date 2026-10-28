import { redirect } from "next/navigation";
import Link from "next/link";
import Confetti from "@/components/Confetti";
import Countdown from "@/components/Countdown";
import AppTabs from "./AppTabs";
import QuoteStrip from "./QuoteStrip";
import ShareButtons from "./ShareButtons";
import GearUp from "./GearUp";
import DosaCard from "./DosaCard";
import QuickLog from "@/components/QuickLog";
import MyStreaks from "@/components/MyStreaks";
import { autoClaims, myHabitLogs, streakBoard } from "@/lib/habits";
import { siteUrl } from "@/lib/email";
import { quoteOfTheDay } from "@/lib/quotes";
import { signOut } from "../actions";
import { currentParticipant, isAdmin } from "@/lib/auth";
import { loadBoard } from "@/lib/board";
import { displayName } from "@/lib/db";
import { EVENTS, HARD_TRUTHS, WEEK_PLAN } from "@/lib/season.ts";
import { fmtWhen, upcoming } from "@/lib/schedule";
import { today, weekday } from "@/lib/streak.ts";
import { DOSAS, dosaCount, type DosaKind } from "@/lib/profile.ts";

export const dynamic = "force-dynamic";

export default async function Board({ searchParams }: { searchParams: { joined?: string } }) {
  const me = await currentParticipant();
  const admin = isAdmin();
  if (!me?.accepted_at && !admin) redirect("/");
  const [rows, quote, habits, streaks, { next: ms }] = await Promise.all([loadBoard(), quoteOfTheDay(), me ? myHabitLogs(me.id) : null, streakBoard(), upcoming()]);
  const mine = rows.find((r) => r.id === me?.id);
  const todayPlan = WEEK_PLAN[weekday()];
  const truth = HARD_TRUTHS[Math.floor(Date.parse(today()) / 864e5) % HARD_TRUTHS.length];
  const first = me ? displayName(me).split(" ")[0] : "Admin";
  const dosaWall = rows.filter((r) => dosaCount(r.profile) > 0).map((r) => {
    const fav = (Object.keys(DOSAS) as DosaKind[]).reduce((a, k) => ((r.profile.dosas?.[k] ?? 0) > (r.profile.dosas?.[a] ?? 0) ? k : a), "masala");
    return { id: r.id, name: r.name.split(" ")[0], count: dosaCount(r.profile), icon: DOSAS[fav].icon };
  }).sort((a, b) => b.count - a.count);

  // Each streak this member follows, with where they stand on its board.
  const myStreaks = me ? streaks.filter((b) => me.profile?.habitsOn?.includes(b.id)).map((b) => {
    const i = b.rows.findIndex((r) => r.id === me.id), r = b.rows[i];
    const cur = r?.current ?? 0;
    return {
      id: b.id, icon: b.icon, name: b.name, current: cur, rank: cur ? i + 1 : null, of: b.rows.length,
      note: r?.slippedToday ? "Reset today. Day 1 starts tomorrow." : cur ? `#${i + 1} of ${b.rows.length} · best ${r.best}` : "Log today to start",
    };
  }) : [];

  const todayTab = (
    <>
      {me && <GearUp installed={!!me.profile?.installedAt} lockedIn={!!me.profile?.lockedInAt} name={first} />}
      <div className="stats3" id="you">
        <div><b>#{mine?.rank ?? "–"}</b><span>Rank</span></div>
        <div><b>{mine?.total ?? 0}</b><span>Points</span></div>
        <div><b>{mine?.streak ?? 0}🔥</b><span>Training</span></div>
      </div>
      {me && <MyStreaks items={myStreaks} />}
      <div className="truth">
        <span className="label">Hard truth</span>
        <p>{truth.text}</p>
        <small>{truth.source}</small>
      </div>
      {me && (
        <div className="card-s">
          <span className="label">Today</span>
          <h3>{todayPlan.title}</h3>
          <p className="note">{todayPlan.detail}</p>
          <ol className="week" aria-label="This week's plan">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => <li key={d} className={d === weekday() ? "on" : ""} title={WEEK_PLAN[d].title}><b>{WEEK_PLAN[d].day[0]}</b><small>{WEEK_PLAN[d].title.split(" ")[0]}</small></li>)}
          </ol>
        </div>
      )}
      <div className="card-s">
        <span className="label">Next up</span>
        <Countdown to={ms.at} label={ms.label} when={fmtWhen(ms.at)} note={ms.note} />
      </div>
      <QuoteStrip text={quote.text} author={quote.author} canAdd={!!me} />
    </>
  );

  const meTab = (
    <>
      <h2 className="tab-h">{first}</h2>
      <ul className="menu">
        {me && <li><Link href="/profile">Edit your profile <span>→</span></Link></li>}
        {me && mine && mine.total > 0 && <li><Link href={`/certificate/${me.id}`}>Your certificate <span>→</span></Link></li>}
        {me && mine && mine.total > 0 && <li><a href={`/api/poster/${me.id}`}>Your poster <span>→</span></a></li>}
        {admin && <li><Link href="/admin">Admin panel <span>→</span></Link></li>}
        <li><Link href="/">Home page <span>→</span></Link></li>
      </ul>
      {me && mine && <ShareButtons id={me.id} rank={mine.rank} total={mine.total} streak={mine.streak} site={siteUrl()} />}
      {me && <DosaCard total={dosaWall.reduce((n, d) => n + d.count, 0)} wall={dosaWall} offeredToday={me.profile?.dosas?.last === today()} meId={me.id} meName={first} />}
      {me && <form action={signOut}><button className="ghost wide" type="submit">Sign out</button></form>}
    </>
  );

  return (
    <>
      {/* A fresh open of the app always starts on Home; Enter the arena (or a notification link) comes back here. */}
      <script dangerouslySetInnerHTML={{ __html: `try{if(!sessionStorage.getItem("wa_home")&&!location.hash&&!location.search)location.replace("/")}catch(e){}` }} />
      <Confetti onLoad={searchParams.joined === "1"} />
      <div className="app">
        <header className="appbar">
          <Link className="mark" href="/">Winter Arc</Link>
          <span className="pill">{me ? `#${mine?.rank ?? "–"} · ${first}` : "Admin view"}</span>
        </header>
        {me && habits && <QuickLog logs={habits.logs} on={me.profile?.habitsOn ?? null} claims={autoClaims(me, habits.logs)} missing={habits.missing} />}
        <AppTabs streaks={streaks} rows={rows} meId={me?.id ?? null} events={EVENTS.map((e) => ({ id: e.id, name: e.name, category: e.category, tba: e.scoring.kind === "tba" }))} today={todayTab} me={meTab} />
      </div>
    </>
  );
}
