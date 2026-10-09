import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Confetti from "@/components/Confetti";
import Live from "./Live";
import TrainedButton from "./TrainedButton";
import QuoteStrip from "./QuoteStrip";
import { quoteOfTheDay } from "@/lib/quotes";
import { signOut } from "../actions";
import { currentParticipant, isAdmin } from "@/lib/auth";
import { loadBoard } from "@/lib/board";
import { recentTaunts } from "@/lib/db";
import { EVENTS, TZ, nextMilestone } from "@/lib/season.ts";

export const dynamic = "force-dynamic";

export default async function Board({ searchParams }: { searchParams: { joined?: string } }) {
  const me = await currentParticipant();
  const admin = isAdmin();
  if (!me?.accepted_at && !admin) redirect("/");
  const [rows, taunts, quote] = await Promise.all([loadBoard(), recentTaunts(), quoteOfTheDay()]);
  const mine = rows.find((r) => r.id === me?.id);
  const ms = nextMilestone();
  const when = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(ms.at));

  return (
    <>
      <Confetti onLoad={searchParams.joined === "1"} />
      <div className="wrap">
        <Header right={<>{admin && <Link href="/admin">Admin</Link>}<Link href="/">Home</Link><span className="pill">{me ? `You: #${mine?.rank ?? "–"}` : "Admin view"}</span>{me && <form action={signOut}><button className="ghost small" type="submit">Sign out</button></form>}</>} />
        <div className="topline">
          <span><b>{ms.label}</b> in {Math.max(0, Math.ceil((new Date(ms.at).getTime() - Date.now()) / 86400000))} days · {when}</span>
          {me && <span className="nav">{mine && mine.total > 0 && <><Link href={`/certificate/${me.id}`}>Certificate</Link><a href={`/api/poster/${me.id}`}>Poster</a></>}<Link href="/profile">Edit your fighter →</Link></span>}
        </div>
        <QuoteStrip text={quote.text} author={quote.author} canAdd={!!me} />
        {me && mine && <TrainedButton done={!!mine.recent[mine.recent.length - 1]} streak={mine.streak} />}
        <Live rows={rows} taunts={taunts} meId={me?.id ?? null} events={EVENTS.map((e) => ({ id: e.id, name: e.name, weekend: e.weekend }))} />

      </div>
    </>
  );
}
