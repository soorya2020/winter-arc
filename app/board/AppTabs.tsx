"use client";
import { useEffect, useState } from "react";
import type { BoardRow } from "@/lib/board";
import Arena from "./Arena";
import BoardLive from "./BoardLive";

// The member app: four tabs and a bottom bar. The hash keeps links like /board#you working.

type Tab = "today" | "ring" | "ranks" | "me";
const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: "today", label: "Today", icon: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" /> },
  { id: "ring", label: "Ring", icon: <><circle cx="12" cy="12" r="8" /><path d="m9 9 6 6M15 9l-6 6" /></> },
  { id: "ranks", label: "Ranks", icon: <path d="M5 20v-6h4v6M10 20V8h4v12M15 20v-9h4v9" /> },
  { id: "me", label: "Me", icon: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1-4 4-6 7-6s6 2 7 6" /></> },
];
const fromHash = (h: string): Tab => (h === "#ring" ? "ring" : h === "#ranks" || h === "#table" ? "ranks" : h === "#me" ? "me" : "today");

export default function AppTabs({ rows: first, meId, events, today, me }: {
  rows: BoardRow[]; meId: string | null; events: { id: string; name: string; weekend: string }[]; today: React.ReactNode; me: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("today");
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
          <BoardLive rows={rows} at={at} meId={meId} events={events} />
        </div>
      )}
      <div className="tab" hidden={tab !== "me"}>{me}</div>
      <nav className="tabbar" aria-label="App">
        {TABS.map((t) => (
          <button key={t.id} type="button" aria-current={tab === t.id ? "page" : undefined} onClick={() => go(t.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
