"use client";
import type { BoardRow } from "@/lib/board";
import CountUp from "@/components/CountUp";
import { BOARD_MAX, CATEGORIES } from "@/lib/season.ts";
import { palette } from "@/lib/theme";
import { useEffect, useRef, useState } from "react";

const COLORS = palette.jerseys;

// Race track: one lane per person, their token placed by points on the way to the finish
// (BOARD_MAX points). Tap a lane for the event-by-event scores.
export default function BoardLive({ rows, at, meId, events }: { rows: BoardRow[]; at: string | null; meId: string | null; events: { id: string; name: string; category: string; tba: boolean }[] }) {
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

  const finish = BOARD_MAX;

  return (
    <div ref={ref} className={`race${seen ? " in" : ""}`}>
      <div className="race-axis" aria-hidden="true">
        <span />
        <span className="marks"><span>Start</span><span>Finish · {finish}</span></span>
        <span>Pts</span>
      </div>
      {rows.map((r, i) => {
        const x = Math.min(100, (r.total / finish) * 100);
        const me = r.id === meId;
        const color = me ? palette.accent : COLORS[i % COLORS.length];
        // Places moved since the last scoring day: positive is up the board.
        const moved = r.prevRank != null ? r.prevRank - r.rank : null;
        return (
          <details key={r.id} className={`lane r${r.rank}${me ? " me" : ""}`} style={{ ["--i" as string]: i, ["--c" as string]: color, ["--x" as string]: `${x}%` }}>
            <summary>
              <span className="rk" aria-label={moved == null ? `Rank ${r.rank}` : `Rank ${r.rank}, was ${r.prevRank}${moved ? `, ${moved > 0 ? "up" : "down"} ${Math.abs(moved)}` : ", no change"}`}>
                {r.rank}
                {moved != null && (
                  <span className={`mv ${moved > 0 ? "up" : moved < 0 ? "down" : "same"}`} aria-hidden="true">
                    <b>{moved > 0 ? `▲${moved}` : moved < 0 ? `▼${-moved}` : "="}</b>
                  </span>
                )}
              </span>
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
              <p className="sub">{r.name}{me ? " (you)" : ""} {CATEGORIES.map((c) => ` · ${c.name} ${r.byCategory[c.id]}`).join("")}{moved != null && r.prevSince ? ` · ${moved ? `${moved > 0 ? "Up" : "Down"} ${Math.abs(moved)}` : "Held"} since ${new Date(`${r.prevSince}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}{r.leap ? ` · ${r.leap > 0 ? "+" : ""}${r.leap} vs baseline` : ""} · {r.streak}-day streak</p>
              <div className="bars">
                {events.map((e) => {
                  const p = r.perEvent[e.id];
                  return (
                    <div key={e.id} title={`${e.name}: ${e.tba ? "points TBA" : p ?? "not scored yet"}`}>
                      <span>{e.name.replace("100 m ", "")} {e.tba ? "TBA" : p != null ? Math.round(p) : "–"}</span>
                      <span className="track"><i style={{ width: `${p ?? 0}%`, background: e.category === "explosive" ? "var(--accent)" : "var(--ink)" }} /></span>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        );
      })}
      <p className="note">Tap a lane to see event scores.{rows[0]?.prevSince ? " ▲▼ show places moved since the last scoring day." : ""}{at ? ` Updated ${new Date(at).toLocaleTimeString()}.` : ""}</p>
    </div>
  );
}
