"use client";
import type { BoardRow } from "@/lib/board";

export default function BoardLive({ rows, at, meId, events }: { rows: BoardRow[]; at: string | null; meId: string | null; events: { id: string; name: string; weekend: string }[] }) {

  if (!rows.length) return <div className="panel"><p className="note">Nobody has accepted yet. The board fills up as invites are accepted.</p></div>;

  return (
    <div className="board">
      {rows.map((r) => (
        <details key={r.id} className={`lb r${r.rank}${r.id === meId ? " me" : ""}`}>
          <summary>
            <span className="rk">{r.rank}</span>
            <span className="nm">{r.name}{r.id === meId ? " (you)" : ""}<span className="sub">{r.streak ? ` · ${r.streak}-day streak` : ""}</span></span>
            <span className="tot">{r.total}</span>
          </summary>
          <div className="bars">
            {events.map((e) => {
              const p = r.perEvent[e.id];
              return (
                <div key={e.id}>
                  <span>{e.name.replace("100 m ", "")} {p != null ? Math.round(p) : "–"}</span>
                  <span className="track"><i style={{ width: `${p ?? 0}%`, background: e.weekend === "running" ? "var(--accent)" : "var(--ink)" }} /></span>
                </div>
              );
            })}
          </div>
        </details>
      ))}
      {at && <p className="note">Updated {new Date(at).toLocaleTimeString()}</p>}
    </div>
  );
}
