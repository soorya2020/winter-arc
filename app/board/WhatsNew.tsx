"use client";
import { useEffect, useRef } from "react";
import type { BoardRow } from "@/lib/board";

// One-time "What's new" sheet. Bump KEY for the next update so everyone sees it once more.
const KEY = "wa-new-rank-moves";

export default function WhatsNew({ mine, onSee }: { mine: BoardRow | undefined; onSee: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let seen = false;
    try { seen = !!localStorage.getItem(KEY); } catch { /* private mode: show it */ }
    if (!seen) ref.current?.showModal?.();
  }, []);
  const close = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    ref.current?.close();
  };

  const moved = mine?.prevRank != null ? mine.prevRank - mine.rank : null;
  const you = moved == null ? null
    : moved > 0 ? `You climbed ${moved} place${moved > 1 ? "s" : ""} to #${mine!.rank}. Keep going.`
    : moved < 0 ? `You slipped ${-moved} place${moved < -1 ? "s" : ""} to #${mine!.rank}. Time to take them back.`
    : `You held #${mine!.rank}. Hold it or climb.`;

  return (
    <dialog ref={ref} className="sheet new-sheet" aria-label="What's new" onClose={close} onClick={(e) => { if (e.target === ref.current) close(); }}>
      <div className="sheet-in">
        <span className="label">New on Ranks</span>
        <h2>See who&apos;s moving</h2>
        <div className="new-demo" aria-hidden="true">
          <div><span className="rk">2<span className="mv up"><b>▲2</b></span></span><span>Climbed 2 places</span></div>
          <div><span className="rk">3<span className="mv down"><b>▼1</b></span></span><span>Dropped 1 place</span></div>
          <div><span className="rk">8<span className="mv same"><b>=</b></span></span><span>Same spot</span></div>
        </div>
        <p className="new-why">Every name on the leaderboard now shows how many places they moved since the last event day.</p>
        {you && <p className="new-you">{you}</p>}
        <div className="new-btns">
          <button type="button" className="cta" onClick={() => { close(); onSee(); }}>See the ranks</button>
          <button type="button" className="new-later" onClick={close}>Got it</button>
        </div>
      </div>
    </dialog>
  );
}
