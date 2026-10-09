"use client";
import { useEffect, useState } from "react";
import type { BoardRow } from "@/lib/board";

const BAR_COLORS = ["var(--pink)", "var(--pink)", "var(--pink)", "var(--yellow)", "var(--yellow)", "var(--yellow)"];

export default function BoardLive({ initial, meId, events }: { initial: BoardRow[]; meId: string | null; events: { id: string; name: string }[] }) {
  const [rows, setRows] = useState(initial);
  const [at, setAt] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch("/api/board", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (alive) { setRows(j.rows); setAt(j.at); }
      } catch { /* keep the last board on a network blip */ }
    };
    const id = setInterval(pull, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!rows.length) return <div className="panel"><p className="note">Nobody has accepted yet. The board fills up as invites are accepted.</p></div>;

  return (
    <div className="board">
      {rows.map((r) => (
        <div key={r.id} className={`lb r${r.rank}${r.id === meId ? " me" : ""}`}>
          <span className="rk">{r.rank}</span>
          <div style={{ minWidth: 0 }}>
            <div className="nm">{r.name}{r.id === meId ? " (you)" : ""}</div>
            <div className="sub">
              Run {r.running} · Strength {r.strength}
              {r.leap ? ` · ${r.leap > 0 ? "+" : ""}${r.leap} vs baseline` : ""}
              {" · "}{r.streak}-day streak
              <span className="streak" aria-label={`${r.recent.filter(Boolean).length} of last 10 days trained`}>
                {r.recent.map((on, i) => <i key={i} className={on ? "on" : ""} />)}
              </span>
            </div>
          </div>
          <span className="tot">{r.total}</span>
          <div className="bars">
            {events.map((e, i) => {
              const p = r.perEvent[e.id];
              return (
                <div key={e.id} title={`${e.name}: ${p ?? "not scored yet"}`}>
                  <span>{e.name.replace("100 m ", "")} {p != null ? Math.round(p) : "–"}</span>
                  <span className="track"><i style={{ width: `${p ?? 0}%`, background: BAR_COLORS[i % 6] }} /></span>
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
