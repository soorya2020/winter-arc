"use client";
import type { BoardRow } from "@/lib/board";
import CountUp from "@/components/CountUp";
import { MAX_PER_EVENT } from "@/lib/season.ts";
import { palette } from "@/lib/theme";
import { useEffect, useRef, useState } from "react";

const COLORS = palette.jerseys;

// Race track: one lane per person, their token placed by points on the way to the finish
// (every event maxed). Tap a lane for the event-by-event scores.
export default function BoardLive({ rows, at, meId, events }: { rows: BoardRow[]; at: string | null; meId: string | null; events: { id: string; name: string; weekend: string }[] }) {
  // Tokens run out from the start line the first time the board scrolls into view.
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!rows.length) return <div className="panel"><p className="note">Nobody has accepted yet. The board fills up as invites are accepted.</p></div>;

  const finish = events.length * MAX_PER_EVENT;
  const runDone = events.filter((e) => e.weekend === "running").length * MAX_PER_EVENT;

  return (
    <div ref={ref} className={`race${seen ? " in" : ""}`}>
      <div className="race-axis" aria-hidden="true">
        <span />
        <span className="marks"><span>Start</span><span style={{ left: `${(runDone / finish) * 100}%` }}>Running done</span><span>Finish · {finish}</span></span>
        <span>Pts</span>
      </div>
      {rows.map((r, i) => {
        const x = Math.min(100, (r.total / finish) * 100);
        const me = r.id === meId;
        const color = me ? palette.accent : COLORS[i % COLORS.length];
        return (
          <details key={r.id} className={`lane r${r.rank}${me ? " me" : ""}`} style={{ ["--i" as string]: i, ["--c" as string]: color, ["--x" as string]: `${x}%` }}>
            <summary>
              <span className="rk">{r.rank}</span>
              <span className="lane-track" aria-label={`${r.name}: ${r.total} of ${finish} points`}>
                <span className="trail" />
                <span className={`tok${x > 62 ? " flip" : ""}`}>
                  <span className="av">{r.name.slice(0, 1).toUpperCase()}</span>
                  <span className="tok-nm">{me ? "You" : r.name.split(" ")[0]}{r.profile?.lockedInAt ? <span className="lock" title="Locked in" aria-label="Locked in"> 🔒</span> : null}{r.streak > 0 ? <small> 🔥{r.streak}</small> : null}</span>
                </span>
              </span>
              <span className="tot"><CountUp value={r.total} run={seen} /></span>
            </summary>
            <div className="lane-more">
              <p className="sub">{r.name}{me ? " (you)" : ""} · Run {r.running} · Strength {r.strength}{r.leap ? ` · ${r.leap > 0 ? "+" : ""}${r.leap} vs baseline` : ""} · {r.streak}-day streak</p>
              <div className="bars">
                {events.map((e) => {
                  const p = r.perEvent[e.id];
                  return (
                    <div key={e.id} title={`${e.name}: ${p ?? "not scored yet"}`}>
                      <span>{e.name.replace("100 m ", "")} {p != null ? Math.round(p) : "–"}</span>
                      <span className="track"><i style={{ width: `${p ?? 0}%`, background: e.weekend === "running" ? "var(--accent)" : "var(--ink)" }} /></span>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        );
      })}
      <p className="note">Tap a lane to see event scores.{at ? ` Updated ${new Date(at).toLocaleTimeString()}.` : ""}</p>
    </div>
  );
}
