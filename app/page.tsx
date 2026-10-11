import Link from "next/link";
import Countdown from "@/components/Countdown";
import Confetti from "@/components/Confetti";
import AcceptForm from "./AcceptForm";
import LinkForm from "./LinkForm";
import AuthPopup from "./AuthPopup";
import OrgAvatar from "@/components/OrgAvatar";
import HeroFun from "@/components/HeroFun";
import QuickLog from "@/components/QuickLog";
import { myHabitLogs } from "@/lib/habits";
import { currentParticipant } from "@/lib/auth";
import { displayName } from "@/lib/db";
import { EVENTS, SEASON } from "@/lib/season.ts";
import { fmtWhen, upcoming } from "@/lib/schedule";
import { palette } from "@/lib/theme";

export const dynamic = "force-dynamic";

const ORGANIZERS = [
  { name: "Soorya", wa: "917561071554", kind: "lift" as const, jersey: palette.accent, num: "1", role: "Organizer · built this website", line: "Built the whole site, from the arena to the roasts. Now he has to survive the leaderboard he made." },
  { name: "Sanat", wa: "917356437300", kind: "run" as const, jersey: palette.jerseys[1], num: "2", role: "Organizer · started it all", line: "Said \"let's make it a competition\". It was supposed to be casual. It ended up being serious stuff like this." },
];

export default async function Home() {
  const me = await currentParticipant().catch(() => null);
  const { next: ms } = await upcoming();
  const first = me ? displayName(me).split(" ")[0] : null;
  const habits = me?.accepted_at ? await myHabitLogs(me.id).catch(() => null) : null;

  return (
    <>
      {/* Remember Home was seen this session, so Enter the arena isn't bounced back here. */}
      <script dangerouslySetInnerHTML={{ __html: `try{sessionStorage.setItem("wa_home","1")}catch(e){}` }} />
      <Confetti onLoad={!!me && !me.accepted_at} />
      <div className="app home">
        <header className="appbar">
          <Link className="mark" href="/">Winter Arc</Link>
          <span className="pill">Season 2026</span>
        </header>

        <div className="hero">
          <p className="hello">{first ? `Hey ${first}` : "By invitation only"}</p>
          <h1>Winter<br /><em>Arc.</em></h1>
          <HeroFun />
          <p className="lede">{SEASON.spots} athletes. {EVENTS.length} events. Two weekends. <b>No excuses.</b></p>

          <Countdown to={ms.at} label={ms.label} when={fmtWhen(ms.at, true)} note={ms.note} />
          {me?.accepted_at
            ? <Link className="cta wide" href="/board">Enter the arena <span>→</span></Link>
            : me
              ? <AuthPopup label="Claim your spot" title="Claim your spot"><AcceptForm defaultName={me.nickname || me.name} /></AuthPopup>
              : <AuthPopup label="Sign in" title="Members sign in"><LinkForm /></AuthPopup>}
          {me?.accepted_at && habits && <QuickLog logs={habits.logs} off={me.profile?.habitsOff ?? []} missing={habits.missing} home />}
        </div>

        <section className="orgs" id="organizers">
          <span className="label">The organizers</span>
          <h2>Blame <em>these two.</em></h2>
          <div className="org-grid">
            {ORGANIZERS.map((o) => (
              <div className="org" key={o.name}>
                <div className="org-ava"><OrgAvatar kind={o.kind} jersey={o.jersey} num={o.num} /></div>
                <div className="org-text">
                  <h3>{o.name}</h3>
                  <span className="org-role">{o.role}</span>
                  <p>{o.line}</p>
                  <a className="wa" href={`https://wa.me/${o.wa}`} target="_blank" rel="noopener noreferrer">WhatsApp {o.name}</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="foot">
          <span>Winter Arc · made with love for the crew</span>
          <Link href="/admin">Organizers</Link>
        </footer>
      </div>
    </>
  );
}
