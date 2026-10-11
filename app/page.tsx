import Link from "next/link";
import Countdown from "@/components/Countdown";
import Confetti from "@/components/Confetti";
import AcceptForm from "./AcceptForm";
import LinkForm from "./LinkForm";
import { currentParticipant } from "@/lib/auth";
import { displayName } from "@/lib/db";
import { EVENTS, SEASON } from "@/lib/season.ts";
import { fmtWhen, upcoming } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const ORGANIZERS = [
  { tag: "Soorya", wa: "917561071554" },
  { tag: "Sanat", wa: "917356437300" },
];

export default async function Home() {
  const me = await currentParticipant().catch(() => null);
  const { next: ms } = await upcoming();
  const first = me ? displayName(me).split(" ")[0] : null;

  return (
    <>
      <Confetti onLoad={!!me && !me.accepted_at} />
      <div className="app home">
        <header className="appbar">
          <Link className="mark" href="/">Winter Arc</Link>
          <span className="pill">Season 2026</span>
        </header>

        <div className="hero">
          <p className="hello">{first ? `Hey ${first}` : "By invitation only"}</p>
          <h1>Winter<br /><em>Arc.</em></h1>
          <p className="lede">{SEASON.spots} athletes. {EVENTS.length} events. Two weekends. <b>No excuses.</b></p>
        </div>

        <div className="card-s">
          <span className="label">Next up</span>
          <Countdown to={ms.at} label={ms.label} when={fmtWhen(ms.at, true)} note={ms.note} />
        </div>

        <div id="join">
          {me?.accepted_at
            ? <Link className="cta wide" href="/board">Enter the arena <span>→</span></Link>
            : me
              ? <><h2 className="tab-h">Claim your spot</h2><AcceptForm defaultName={me.nickname || me.name} /></>
              : <LinkForm />}
        </div>

        <footer className="foot">
          <span>Questions? WhatsApp {ORGANIZERS.map((o, i) => <span key={o.tag}>{i ? " or " : ""}<a href={`https://wa.me/${o.wa}`} target="_blank" rel="noopener noreferrer">{o.tag}</a></span>)}.</span>
          <Link href="/admin">Organizers</Link>
        </footer>
      </div>
    </>
  );
}
