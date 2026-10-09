"use client";
import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

export default function Countdown({ to, label, when }: { to: string; label: string; when: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = now == null ? 0 : Math.floor(Math.max(0, target - now) / 1000);
  const parts: [number, string][] = [[Math.floor(s / 86400), "Days"], [Math.floor((s % 86400) / 3600), "Hours"], [Math.floor((s % 3600) / 60), "Min"], [s % 60, "Sec"]];
  return (
    <div className="count" aria-live="polite">
      {parts.map(([v, l]) => (
        <div className="unit" key={l}><b>{now == null ? "--" : pad(v)}</b><span>{l}</span></div>
      ))}
      <p className="count-note"><b>Until {label}</b> · {when}</p>
    </div>
  );
}
