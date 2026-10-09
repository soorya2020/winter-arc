"use client";
import type { BoardRow } from "@/lib/board";
import CountUp from "@/components/CountUp";
import { useEffect, useRef, useState } from "react";

export default function BoardLive({ rows, at, meId, events }: { rows: BoardRow[]; at: string | null; meId: string | null; events: { id: string; name: string; weekend: string }[] }) {
  // Rows slide in and totals count up the first time the board scrolls into view.
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

  return (
    <div ref={ref} className={`board${seen ? " in" : ""}`}>
      {rows.map((r, i) => (
        <div key={r.id} className={`lb r${r.rank}${r.id === meId ? " me" : ""}`} style={{ ["--i" as string]: i }}>
          <span className="rk">{r.rank}</span>
          <div style={{ minWidth: 0 }}>
            <div className="nm">{r.name}{r.id === meId ? " (you)" : ""}</div>
            <div className="sub">
              Run {r.running} · Strength {r.strength}
              {r.leap ? ` · ${r.leap > 0 ? "+" : ""}${r.leap} vs baseline` : ""}
              {" · "}{r.streak}-day streak
              <span className="streak" aria-label={`${r.recent.filter(Boolean).length} of last 10 days trained`}>
                {r.recent.map((on, d) => <i key={d} className={on ? "on" : ""} style={{ ["--d" as string]: d }} />)}
              </span>
            </div>
          </div>
          <span className="tot"><CountUp value={r.total} run={seen} /></span>
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
      ))}
      {at && <p className="note">Updated {new Date(at).toLocaleTimeString()}</p>}
    </div>
  );
}
