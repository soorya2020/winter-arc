import Link from "next/link";
import Header from "@/components/Header";
import Countdown from "@/components/Countdown";
import Confetti from "@/components/Confetti";
import AcceptForm from "./AcceptForm";
import { currentParticipant } from "@/lib/auth";
import { displayName } from "@/lib/db";
import { AWARDS, DRILLS, EVENTS, SEASON, TIMELINE, TZ, WEEK_PLAN, nextMilestone } from "@/lib/season.ts";

export const dynamic = "force-dynamic";

const EXAMPLES = [
  { who: "The runner", total: 425, vals: [100, 95, 70, 40, 60, 60], limit: "upper body", line: "Ran 22 km in training, but only 10 count." },
  { who: "The lifter", total: 430, vals: [50, 45, 80, 100, 90, 65], limit: "endurance", line: "Stopped the long run at 5 km and still banked 50." },
];
const EX_ORDER = ["long-run", "3k", "sprint", "push-ups", "plank", "burpees"];
const TICKER = ["10 km long run", "3 km run", "100 m sprint", "Max push-ups", "Plank hold", "Burpees", "Daily log"];

export default async function Home() {
  const me = await currentParticipant().catch(() => null);
  const ms = nextMilestone();
  const when = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ms.at));
  const first = me ? displayName(me).split(" ")[0] : null;

  return (
    <>
      <Confetti onLoad={!!me && !me.accepted_at} />
      <div className="wrap">
        <Header right={me?.accepted_at ? <Link className="pill" href="/board">Your arena →</Link> : undefined} />

        <div className="hero">
          <p className="hello">{first ? `${first}, you were picked for a reason` : "By invitation only"}</p>
          <h1>Winter<br /><em>Arc.</em></h1>
          <div className="hero-row">
            <p className="lede">{SEASON.spots} athletes. {EVENTS.length} events. Two weekends. <b>No excuses accepted.</b></p>
            <div style={{ display: "grid", gap: "1.25rem" }}>
              <Countdown to={ms.at} label={ms.label} when={when} />
              {me?.accepted_at
                ? <Link className="cta" href="/board">Enter the arena <span>→</span></Link>
                : me
                  ? <a className="cta" href="#join">Claim your spot <span>→</span></a>
                  : <p className="note">Invite only. Open the link in your invite email to claim your spot.</p>}
            </div>
          </div>
        </div>

        <div className="ticker" aria-hidden="true">
          <div>{[0, 1, 2, 3].flatMap((k) => TICKER.map((w) => <span key={k + w}>{w} ·</span>))}</div>
        </div>

        <div className="stats">
          <div><b>10 km</b><span>Long run cap</span></div>
          <div><b>14.0 s</b><span>100 m sprint for full points</span></div>
          <div><b>50</b><span>Push-ups for full points</span></div>
          <div><b>5:00</b><span>Plank cap</span></div>
        </div>

        <section id="arc">
          <div className="head">
            <span className="label">The season</span>
            <h2>The arc</h2>
            <p>A test at the start, a test at the end, and daily training in between.</p>
          </div>
          <div className="tl">
            {TIMELINE.map((t) => (
              <div className="stop" key={t.title}><span className="when">{t.when}</span><h3>{t.title}</h3><p>{t.text}</p></div>
            ))}
          </div>
        </section>

        <section id="events">
          <div className="head">
            <span className="label">{EVENTS.length} events · 100 points each · {EVENTS.length * 100} max</span>
            <h2>Every rep counts</h2>
            <p>Each event has a cap that a trained beginner can reach. Going past it earns nothing extra, so a specialist can't run away with one event. Doing anything at all earns points.</p>
          </div>
          <div className="cols">
            {(["running", "strength"] as const).map((w) => (
              <div className="day" key={w}>
                <span className="label">{w === "running" ? "Running weekend" : "Strength weekend"}</span>
                {EVENTS.filter((e) => e.weekend === w).map((e) => (
                  <div className="ev" key={e.id}>
                    <h3>{e.name}</h3><span className="max">100</span><p>{e.blurb}</p><span className="rule">{e.rule}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section id="fair">
          <div className="head">
            <span className="label">Why it's fair</span>
            <h2>Find your limit</h2>
            <p>Your profile shows what share of each cap you hit. The low bar is your limit. Heavy lifts aren't scored because raw strength depends on body weight; these events test strength against your own body.</p>
          </div>
          <div className="fair">
            {EXAMPLES.map((x) => (
              <div className="who" key={x.who}>
                <div className="who-top"><h3>{x.who}</h3><span className="ex">Example</span><span className="tot">{x.total}</span></div>
                {EX_ORDER.map((id, i) => (
                  <div className="row" key={id} style={{ ["--c" as string]: i < 3 ? "var(--accent)" : "var(--ink)" }}>
                    <span>{EVENTS.find((e) => e.id === id)?.name.replace("100 m ", "")}</span>
                    <span className="track"><i style={{ width: `${x.vals[i]}%` }} /></span><b>{x.vals[i]}</b>
                  </div>
                ))}
                <p className="limit">{x.line} Limit: <b>{x.limit}</b>.</p>
              </div>
            ))}
          </div>
        </section>

        <section id="train">
          <div className="head">
            <span className="label">Practice</span>
            <h2>Train for it</h2>
            <p>Beginner to medium friendly. No gym needed. Your daily email picks today's session from this plan.</p>
          </div>
          <div className="split">
            <div className="box">
              <h3>A normal week</h3>
              <div className="week">
                {[...WEEK_PLAN.slice(1), WEEK_PLAN[0]].map((d) => <div key={d.day}><b>{d.day}</b><span><strong>{d.title}.</strong> {d.detail}</span></div>)}
              </div>
            </div>
            <div className="box">
              <h3>Drill bank</h3>
              <div className="chips">{DRILLS.map((d) => <span key={d}>{d}</span>)}</div>
              <p className="note">Start with the easier version (incline or knee push-ups, shorter planks) and move up when you can do 3 clean sets.</p>
            </div>
          </div>
        </section>

        <section id="awards">
          <div className="head">
            <span className="label">What you walk away with</span>
            <h2>Glory, officially</h2>
            <p>Every finisher gets a certificate with their numbers and a poster for the group chat.</p>
          </div>
          <div className="awards">
            {AWARDS.map((a) => <div className="award" key={a.title}><h3>{a.title}</h3><p>{a.text}</p></div>)}
          </div>
        </section>

        <div className="rsvp" id="join">
          <div>
            <h2>{me?.accepted_at ? <>You're <em>in.</em></> : <>Your spot is <em>waiting.</em></>}</h2>
            <p>{me?.accepted_at
              ? "Your fighter is in the arena. Log every session to keep your streak alive."
              : "Accept the invite, pick your name and your catchphrase. Your fighter joins the arena straight away."}</p>
          </div>
          {me?.accepted_at
            ? <div><Link className="cta" href="/board">Enter the arena <span>→</span></Link></div>
            : me
              ? <AcceptForm defaultName={me.nickname || me.name} />
              : <div className="panel"><p className="note">This page only opens up through a personal invite link. Check your email for yours.</p></div>}
        </div>

        <footer>
          <span className="label">Winter Arc · by invitation</span>
          <span className="note">Questions? Reply to your invite email.</span>
        </footer>
      </div>
    </>
  );
}
