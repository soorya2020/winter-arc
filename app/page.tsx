import Link from "next/link";
import Header from "@/components/Header";
import Countdown from "@/components/Countdown";
import Confetti from "@/components/Confetti";
import Reveal from "@/components/Reveal";
import HeroFun from "@/components/HeroFun";
import OrgAvatar from "@/components/OrgAvatar";
import AcceptForm from "./AcceptForm";
import LinkForm from "./LinkForm";
import { currentParticipant } from "@/lib/auth";
import { allParticipants, displayName } from "@/lib/db";
import { EVENTS, SEASON, TZ, nextMilestone } from "@/lib/season.ts";

export const dynamic = "force-dynamic";

const ORGANIZERS = [
  { name: "Soorya", tag: "Soorya", kind: "lift" as const, jersey: "#ff4d00", num: "1", role: "Organizer · built this website", line: "Built the whole site, from the arena to the roasts. Now he has to survive the leaderboard he made." },
  { name: "Sanat", tag: "Sanat", kind: "run" as const, jersey: "#2f6fed", num: "2", role: "Organizer · started it all", line: "Said \"let's make it a competition\". It was supposed to be casual. It ended up being serious stuff like this." },
];

export default async function Home() {
  const me = await currentParticipant().catch(() => null);
  const ms = nextMilestone();
  const when = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ms.at));
  const first = me ? displayName(me).split(" ")[0] : null;
  const rivals = me && !me.accepted_at
    ? (await allParticipants()).filter((p) => p.accepted_at && p.id !== me.id).map((p) => ({ id: p.id, name: displayName(p) }))
    : [];

  return (
    <>
      <Confetti onLoad={!!me && !me.accepted_at} />
      <Reveal />
      <div className="wrap home" data-m="a">
        <Header right={me?.accepted_at ? <Link className="pill" href="/board">Your arena →</Link> : undefined} />

        <div className="hero">
          <p className="hello">{first ? `${first}, you were picked for a reason` : "By invitation only"}</p>
          <div className="hero-top">
            <h1>Winter<br /><em>Arc.</em></h1>
            <HeroFun />
          </div>
          <div className="hero-row">
            <p className="lede">{SEASON.spots} athletes. {EVENTS.length} events. Two weekends. <b>No excuses accepted.</b></p>
            <div style={{ display: "grid", gap: "1.25rem" }}>
              <Countdown to={ms.at} label={ms.label} when={when} />
              {me?.accepted_at
                ? <Link className="cta" href="/board">Enter the arena <span>→</span></Link>
                : me
                  ? <a className="cta" href="#join">Claim your spot <span>→</span></a>
                  : <a className="cta" href="#join">Members sign in <span>→</span></a>}
            </div>
          </div>
        </div>

        <div className="strip" data-reveal>
          {(["running", "strength"] as const).map((w) => (
            <p key={w}><b>{w === "running" ? "Running weekend" : "Strength weekend"}</b>{EVENTS.filter((e) => e.weekend === w).map((e) => <span className="chip" key={e.id}>{e.name}</span>)}</p>
          ))}
        </div>

        <div className="rsvp" id="join" data-reveal>
          <div>
            <h2>{me?.accepted_at ? <>You're <em>in.</em></> : <>Your spot is <em>waiting.</em></>}</h2>
            <p>{me?.accepted_at
              ? "Your fighter is in the arena. Log every session to keep your streak alive."
              : "Accept the invite, pick your name and tell us how you talk. Your fighter joins the arena straight away."}</p>
          </div>
          {me?.accepted_at
            ? <div><Link className="cta" href="/board">Enter the arena <span>→</span></Link></div>
            : me
              ? <AcceptForm defaultName={me.nickname || me.name} rivals={rivals} />
              : <LinkForm />}
        </div>

        <section className="why" id="why" data-reveal>
          <span className="label">Why we made this</span>
          <h2>Fitness <em>first.</em></h2>
          <input type="checkbox" id="why-more" className="why-toggle" />
          <div className="why-body">
            <p>Work, studies, deadlines: something always wins over the workout. This year we wanted fitness to win for once. Your health is the thing that carries everything else you do, so it deserves to come first.</p>
            <p>Winter Arc is a friendly match dressed up to look intimidating. The countdowns, the leaderboard and the roasts are there to get you moving, not to make anyone feel small. Finish last and you still started something.</p>
            <p>Made with love and care for a few friends. Let's end this year strong and walk into the next one fitter than we've ever been. <b>Happy new year ahead.</b></p>
          </div>
          <label htmlFor="why-more" className="why-more">Read the rest</label>
        </section>

        <section className="orgs" id="organizers" data-o="cards" data-reveal>
          <span className="label">The organizers</span>
          <h2>Blame <em>these two.</em></h2>
          <div className="org-grid">
            {ORGANIZERS.map((o) => (
              <div className="org" key={o.name}>
                <div className="org-ava"><OrgAvatar kind={o.kind} jersey={o.jersey} num={o.num} /><span className="tag">{o.tag}</span></div>
                <div className="org-text">
                  <h3>{o.name}</h3>
                  <span className="org-role">{o.role}</span>
                  <p>{o.line}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* phones only: the main button stays in reach at the bottom */}
        <div className="m-cta">
          {me?.accepted_at
            ? <Link className="cta" href="/board">Enter the arena <span>→</span></Link>
            : <a className="cta" href="#join">{me ? "Claim your spot" : "Members sign in"} <span>→</span></a>}
        </div>

        <footer>
          <span className="label">Winter Arc · made with love for the crew</span>
          <span className="note">Questions? Reply to your invite email. · <Link href="/admin">Organizers</Link></span>
        </footer>
      </div>
    </>
  );
}
