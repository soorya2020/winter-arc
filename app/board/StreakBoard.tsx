"use client";
import { useState } from "react";
import type { StreakBoard as Board } from "@/lib/habits";

// Streaks board: one table per daily habit, ranked by current streak. Separate from the event points.
export default function StreakBoard({ board, meId }: { board: Board; meId: string | null }) {
  const [pick, setPick] = useState(board[0]?.id);
  const b = board.find((x) => x.id === pick) ?? board[0];
  if (!b) return null;
  return (
    <div className="streaks">
      <div className="chips-row" role="group" aria-label="Streak">
        {board.map((x) => <button key={x.id} type="button" aria-pressed={x.id === b.id} onClick={() => setPick(x.id)}>{x.icon} {x.name}</button>)}
      </div>
      {b.rows.length ? (
        <ol className="streak-list">
          {b.rows.map((r, i) => (
            <li key={r.id} className={r.id === meId ? "me" : ""}>
              <span className="rk">{r.current ? i + 1 : "–"}</span>
              <div><b>{r.id === meId ? "You" : r.name}</b><small>Best {r.best} {r.best === 1 ? "day" : "days"}{b.unit && r.total ? ` · ${r.total} ${b.unit} total` : ""}{r.slippedToday ? " · slipped today" : ""}</small></div>
              <span className="cur">{r.current}<i>🔥</i></span>
            </li>
          ))}
        </ol>
      ) : <p className="note">Nobody follows {b.name.toLowerCase()} yet. Tap the + button and pick it to be first.</p>}
      <p className="note">Streaks don&apos;t add event points. Tap + to pick yours and log them each day.</p>
    </div>
  );
}
