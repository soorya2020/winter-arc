"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { trainedToday } from "../actions";

/** The whole practice log: one tap a day keeps the streak going. */
export default function TrainedButton({ done, streak }: { done: boolean; streak: number }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  if (done) return <p className="trained done">Trained today ✓ <span>{streak}-day streak</span></p>;
  return (
    <div className="trained">
      <button className="cta" disabled={pending} onClick={() => start(async () => {
        const r = await trainedToday();
        if (r.error) { setErr(r.error); return; }
        window.dispatchEvent(new Event("confetti")); router.refresh();
      })}>{pending ? "Saving…" : "I trained today"} <span>✓</span></button>
      <p className="note">{streak ? `${streak}-day streak. Tap once a day to keep it going.` : "Tap once a day you train. It builds your streak on the board."}</p>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
