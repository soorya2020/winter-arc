"use client";
import { useEffect, useState } from "react";
import type { BoardRow } from "@/lib/board";
import type { Taunt } from "@/lib/db";
import Arena from "./Arena";
import BoardLive from "./BoardLive";

/** Polls the board and trash talk every few seconds and feeds both the arena and the table. */
export default function Live(props: { rows: BoardRow[]; taunts: Taunt[]; meId: string | null; events: { id: string; name: string; weekend: string }[] }) {
  const [rows, setRows] = useState(props.rows);
  const [taunts, setTaunts] = useState(props.taunts);
  const [at, setAt] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/board", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (alive) { setRows(j.rows); setTaunts(j.taunts); setAt(j.at); }
      } catch { /* keep the last state on a network blip */ }
    };
    const id = setInterval(pull, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return (
    <>
      <Arena rows={rows} taunts={taunts} meId={props.meId} />
      <section style={{ paddingTop: "2.5rem" }}>
        <div className="head">
          <span className="live">Live</span>
          <h2>The table</h2>
          <p>Points update the moment a result is entered. Bars show how close each person got to the cap in every event.</p>
        </div>
        <BoardLive rows={rows} at={at} meId={props.meId} events={props.events} />
      </section>
    </>
  );
}
