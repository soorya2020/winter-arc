"use client";
import { useEffect, useState } from "react";
import type { BoardRow } from "@/lib/board";
import Arena from "./Arena";
import BoardLive from "./BoardLive";
import StreakBoard from "./StreakBoard";
import type { StreakBoard as Streaks } from "@/lib/habits";
import TabBar from "@/components/TabBar";

// The member app: four tabs in a bottom bar. The hash keeps links like /board#you working.

type Tab = "today" | "ring" | "ranks" | "me";
const fromHash = (h: string): Tab => (h === "#ring" ? "ring" : h === "#ranks" || h === "#table" ? "ranks" : h === "#me" ? "me" : "today");

export default function AppTabs({ rows: first, meId, events, today, me, streaks }: {
  streaks: Streaks; rows: BoardRow[]; meId: string | null; events: { id: string; name: string; category: string; tba: boolean }[]; today: React.ReactNode; me: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("today");
  const [board, setBoard] = useState<"events" | "streaks">("events");
  const [rows, setRows] = useState(first);
  const [at, setAt] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setTab(fromHash(location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Live scores: poll while the ring or the table is open.
  useEffect(() => {
    if (tab !== "ring" && tab !== "ranks") return;
    let alive = true;
    const pull = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/board", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (alive) { setRows(j.rows); setAt(j.at); }
      } catch { /* keep the last state on a network blip */ }
    };
    pull();
    const id = setInterval(pull, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [tab]);

  const go = (t: Tab) => { history.replaceState(null, "", `#${t}`); setTab(t); window.scrollTo(0, 0); };

  return (
    <>
      <div className="tab" hidden={tab !== "today"}>{today}</div>
      {tab === "ring" && (
        <div className="tab">
          <h2 className="tab-h">The ring</h2>
          <Arena rows={rows} meId={meId} />
        </div>
      )}
      {tab === "ranks" && (
        <div className="tab">
          <h2 className="tab-h">Ranks</h2>
          <div className="seg2" role="group" aria-label="Leaderboard">
            <button type="button" aria-pressed={board === "events"} onClick={() => setBoard("events")}>Events</button>
            <button type="button" aria-pressed={board === "streaks"} onClick={() => setBoard("streaks")}>Streaks</button>
          </div>
          {board === "events" ? <BoardLive rows={rows} at={at} meId={meId} events={events} /> : <StreakBoard board={streaks} meId={meId} />}
        </div>
      )}
      <div className="tab" hidden={tab !== "me"}>{me}</div>
      <TabBar active={tab} onPick={(t) => go(t as Tab)} />
    </>
  );
}
