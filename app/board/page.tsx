import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Confetti from "@/components/Confetti";
import Countdown from "@/components/Countdown";
import Live from "./Live";
import PracticeForm from "./PracticeForm";
import QuoteStrip from "./QuoteStrip";
import ShareButtons from "./ShareButtons";
import GearUp from "./GearUp";
import { siteUrl } from "@/lib/email";
import { quoteOfTheDay } from "@/lib/quotes";
import { signOut } from "../actions";
import { currentParticipant, isAdmin } from "@/lib/auth";
import { loadBoard } from "@/lib/board";
import { displayName, recentTaunts } from "@/lib/db";
import { EVENTS, WEEK_PLAN } from "@/lib/season.ts";
import { fmtWhen, upcoming } from "@/lib/schedule";
import { weekday } from "@/lib/streak.ts";

export const dynamic = "force-dynamic";

export default async function Board({ searchParams }: { searchParams: { joined?: string } }) {
  const me = await currentParticipant();
  const admin = isAdmin();
  if (!me?.accepted_at && !admin) redirect("/");
  const [rows, taunts, quote] = await Promise.all([loadBoard(), recentTaunts(), quoteOfTheDay()]);
  const mine = rows.find((r) => r.id === me?.id);
  const { next: ms } = await upcoming();
  const when = fmtWhen(ms.at);
  const todayPlan = WEEK_PLAN[weekday()];

  return (
    <>
      <Confetti onLoad={searchParams.joined === "1"} />
      <div className="wrap">
        <Header right={<>{admin && <Link href="/admin">Admin</Link>}<Link href="/">Home</Link><span className="pill">{me ? `You: #${mine?.rank ?? "–"}` : "Admin view"}</span>{me && <form action={signOut}><button className="ghost small" type="submit">Sign out</button></form>}</>} />
        <QuoteStrip text={quote.text} author={quote.author} canAdd={!!me} />
        {me && <GearUp installed={!!me.profile?.installedAt} lockedIn={!!me.profile?.lockedInAt} name={displayName(me).split(" ")[0]} />}
        {me && mine && <ShareButtons id={me.id} rank={mine.rank} total={mine.total} streak={mine.streak} site={siteUrl()} />}
        <Live rows={rows} taunts={taunts} meId={me?.id ?? null} events={EVENTS.map((e) => ({ id: e.id, name: e.name, weekend: e.weekend }))} />

        {me && (
          <section id="you">
            <div className="head">
              <span className="label">Your corner</span>
              <h2>Keep the streak</h2>
            </div>
            <div className="split">
              <div className="box">
                <h3>Today: {todayPlan.title}</h3>
                <p className="note">{todayPlan.detail}</p>
                <PracticeForm />
              </div>
              <div className="box">
                <h3>Next up</h3>
                <Countdown to={ms.at} label={ms.label} when={when} note={ms.note} />
                <p className="note">
                  Streak: <b style={{ color: "var(--accent)" }}>{mine?.streak ?? 0} days</b> · Sessions logged: {mine?.sessions ?? 0}
                  {mine?.limit ? <> · Your limit right now: <b style={{ color: "var(--accent)" }}>{mine.limit}</b></> : null}
                </p>
                <p className="note"><Link href="/profile">Edit your fighter's personality →</Link></p>
                {mine && mine.total > 0 && (
                  <p className="note"><Link href={`/certificate/${me.id}`}>Your certificate</Link> · <a href={`/api/poster/${me.id}`}>Your poster</a></p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
