import Link from "next/link";
import Header from "@/components/Header";
import Countdown from "@/components/Countdown";
import Confetti from "@/components/Confetti";
import AcceptForm from "./AcceptForm";
import { currentParticipant } from "@/lib/auth";
import { displayName } from "@/lib/db";
import { AWARDS, DRILLS, EVENTS, TIMELINE, TZ, WEEK_PLAN, nextMilestone } from "@/lib/season.ts";

export const dynamic = "force-dynamic";

const color = (c: string) => `var(--${c})`;
const EXAMPLES = [
  { who: "The runner", c: "cyan", total: 425, vals: [100, 95, 70, 40, 60, 60], limit: "upper body", line: "Ran 22 km in training, but only 10 count." },
  { who: "The lifter", c: "yellow", total: 430, vals: [50, 45, 80, 100, 90, 65], limit: "endurance", line: "Stopped the long run at 5 km and still banked 50." },
];
const EX_ORDER = ["long-run", "3k", "sprint", "push-ups", "plank", "burpees"];
const TICKER = ["Long run", "Sprint", "Push-ups", "Plank", "Burpees", "3 km", "Test your limits", "No excuses", "Seven spots"];

export default async function Home() {
  const me = await currentParticipant().catch(() => null);
  const ms = nextMilestone();
  const when = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ms.at));
  const first = me ? displayName(me).split(" ")[0] : null;

  return (
    <>
      <Confetti onLoad={!!me} />
      <div className="wrap">
        <div className="glow" />
        <Header right={me?.accepted_at ? <Link className="pill" href="/board">Leaderboard</Link> : undefined} />

        <div className="hero">
          <p className="hello">{first ? `${first}, you've been selected` : "You've been selected"}</p>
          <h1><span className="a">Winter</span> Arc <span className="b">2026</span></h1>
          <p className="lede">Seven people. Six events. Twelve weeks of training. Two weekends where you find out <b>exactly where your limits are</b>, scored so the runner and the lifter start level.</p>
          <Countdown to={ms.at} label={ms.label} when={when} />
          {me?.accepted_at
            ? <Link className="cta" href="/board">Open the leaderboard →</Link>
            : me
              ? <a className="cta" href="#join">Claim my spot →</a>
              : <p className="note">Invite only. Open the link in your invite email to claim your spot.</p>}
        </div>

        <div className="ticker" aria-hidden="true">
          <div>{[0, 1, 2, 3].flatMap((k) => TICKER.map((w) => <span key={k + w}>{w} ✦</span>))}</div>
        </div>

        <section id="arc">
          <div className="head">
            <span className="label">The season</span>
            <h2>The arc</h2>
            <p>A test at the start, a test at the end, and daily training in between.</p>
          </div>
          <div className="tl">
            {TIMELINE.map((t) => (
              <div className="stop" key={t.title} style={{ ["--c" as string]: color(t.color) }}>
                <span className="when">{t.when}</span><h3>{t.title}</h3><p>{t.text}</p>
              </div>
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
              <div className="day" key={w} style={{ ["--c" as string]: color(w === "running" ? "pink" : "yellow") }}>
                <span className="label">{w === "running" ? "Running weekend" : "Strength weekend"}</span>
                {EVENTS.filter((e) => e.weekend === w).map((e) => (
                  <div className="ev" key={e.id}>
                    <h3>{e.name}</h3><span className="max">100 pts</span><p>{e.blurb}</p><span className="rule">{e.rule}</span>
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
            <p>Your profile shows what share of each cap you hit. The low bar is your limit, and that's what the next season trains. Heavy lifts aren't scored because raw strength depends on body weight; these events test strength against your own body.</p>
          </div>
          <div className="fair">
            {EXAMPLES.map((x) => (
              <div className="who" key={x.who} style={{ ["--c" as string]: color(x.c) }}>
                <div className="who-top"><h3>{x.who}</h3><span className="ex">Example</span><span className="tot">{x.total}</span></div>
                {EX_ORDER.map((id, i) => (
                  <div className="row" key={id}>
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
                {[...WEEK_PLAN.slice(1), WEEK_PLAN[0]].map((d) => <div key={d.day}><b>{d.day}</b><span>{d.title}: {d.detail}</span></div>)}
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
            <p>Every finisher gets a certificate with their numbers. Every result gets a poster for your stories and the group chat.</p>
          </div>
          <div className="awards">
            {AWARDS.map((a) => (
              <div className="award" key={a.title} style={{ ["--c" as string]: color(a.color) }}><h3>{a.title}</h3><p>{a.text}</p></div>
            ))}
          </div>
        </section>

        <div className="rsvp" id="join">
          <div>
            <h2>{me?.accepted_at ? "You're in" : "Your spot is waiting"}</h2>
            <p>{me?.accepted_at
              ? "Your name is on the board. Log every session to keep your streak alive."
              : "Accept the invite and you'll be on the board. Your first daily email arrives the next morning."}</p>
          </div>
          {me?.accepted_at
            ? <div className="panel"><Link className="cta" href="/board">Open the leaderboard →</Link></div>
            : me
              ? <AcceptForm defaultName={me.nickname || me.name} />
              : <div className="panel"><p className="note">This page only opens up through a personal invite link. Check your email for yours.</p></div>}
        </div>

        <footer>
          <span className="label">Winter Arc · invite only</span>
          <span className="note">Questions? Reply to your invite email.</span>
        </footer>
      </div>
    </>
  );
}
