"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { logHabit, sendRequest, setHabitsOn, setStreakClaim } from "@/app/actions";
import { HABITS, type Habit } from "@/lib/season.ts";
import { countedDays, streak, today, type StreakClaim } from "@/lib/streak.ts";
import type { HabitLog } from "@/lib/habits";

// The floating + button: one tap opens today's habits, one more logs. Each button shows its own
// spinner while it saves; nothing else on the page waits. Also where members ask the organizers for something.

type Op = { add: number } | { set: 0 | 1 | null };
type Toast = { text: string; id: string; undo?: Op };
const CLOSED = { open: false, view: "log" as "log" | "pick" | "ask" };

// Nobody follows anything by default: the first open asks which streaks this member wants (on = null until they choose).
export default function QuickLog({ logs, on: firstOn, claims: firstClaims, missing, home }: { logs: HabitLog[]; on: string[] | null; claims: Record<string, StreakClaim>; missing: boolean; home?: boolean }) {
  const day = today();
  const [{ open, view }, setSheet] = useState(CLOSED);
  const [on, setOn] = useState(firstOn);
  const [claims, setClaims] = useState(firstClaims);
  const [editing, setEditing] = useState("");
  const [vals, setVals] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(HABITS.map((h) => [h.id, logs.find((l) => l.habit === h.id && l.day === day)?.value ?? null])));
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [err, setErr] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Past days (not today) per habit: which ones count toward the streak, and the best single day.
  const past = useMemo(() => {
    const m: Record<string, { days: string[]; slips: string[]; best: number }> = {};
    for (const h of HABITS) m[h.id] = { days: [], slips: [], best: 0 };
    for (const l of logs) {
      if (!m[l.habit] || l.day === day) continue;
      if (l.value > 0) { m[l.habit].days.push(l.day); m[l.habit].best = Math.max(m[l.habit].best, l.value); } else m[l.habit].slips.push(l.day);
    }
    return m;
  }, [logs, day]);

  const shown = HABITS.filter((h) => on?.includes(h.id));
  // A check habit with a starting streak counts by itself: nothing to log unless they slip.
  const auto = (h: Habit) => h.kind === "check" && !!claims[h.id] && vals[h.id] !== 0;
  const left = shown.filter((h) => vals[h.id] == null && !auto(h)).length;
  const doneN = shown.length - left;

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet(CLOSED); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const streakOf = (h: Habit) => {
    const v = vals[h.id];
    if (h.kind === "check" && v === 0) return 0;
    const good = v ? [...past[h.id].days, day] : past[h.id].days;
    return streak(h.kind === "check" ? countedDays(good, past[h.id].slips, claims[h.id]) : good);
  };

  async function run(h: Habit, key: string, op: Op, next: number | null, say?: (v: number | null) => string, undo?: Op) {
    const prev = vals[h.id];
    setVals((s) => ({ ...s, [h.id]: next }));
    setBusy((s) => ({ ...s, [h.id]: key }));
    setErr((s) => ({ ...s, [h.id]: "" }));
    const r = await logHabit(h.id, op).catch(() => ({ error: "Couldn't save. Check your connection." }) as { value?: number | null; error?: string });
    setBusy((s) => ({ ...s, [h.id]: "" }));
    if (r.error) { setVals((s) => ({ ...s, [h.id]: prev })); setErr((s) => ({ ...s, [h.id]: r.error! })); return; }
    const v = r.value ?? null;
    setVals((s) => ({ ...s, [h.id]: v }));
    clearTimeout(timer.current);
    if (say) {
      setToast({ text: say(v), id: h.id, undo });
      timer.current = setTimeout(() => setToast(null), 5000);
    } else setToast(null);
  }

  const add = (h: Habit & { kind: "count" }, n: number) =>
    run(h, `+${n}`, { add: n }, (vals[h.id] ?? 0) + n, (v) => `+${n} ${h.unit} · ${v ?? 0} today`, { add: -n });
  const check = (h: Habit & { kind: "check" }, yes: boolean) =>
    run(h, yes ? "yes" : "no", { set: yes ? 1 : 0 }, yes ? 1 : 0, () => (yes ? `${h.name} logged. Keep going.` : `${h.name}: slipped today. Day 1 starts tomorrow.`), { set: vals[h.id] as 0 | 1 | null });
  const undo = (t: Toast) => {
    const h = HABITS.find((x) => x.id === t.id)!;
    const cur = vals[h.id];
    const next = t.undo && "add" in t.undo ? Math.max(0, (cur ?? 0) + t.undo.add) || null : t.undo && "set" in t.undo ? t.undo.set : null;
    if (t.undo) run(h, "undo", t.undo, next);
  };

  const sub = (h: Habit) => {
    const v = vals[h.id], s = streakOf(h);
    if (h.kind === "check") {
      if (v !== 0 && claims[h.id]) return `Day ${s} · counting every day`;
      if (v === 1) return `Day ${s} · clean today ✓`;
      if (v === 0) return "Slipped today. Day 1 starts tomorrow.";
      return s ? `Day ${s}` : "Start today";
    }
    const best = Math.max(past[h.id].best, v ?? 0);
    return v ? `${v} today${s > 1 ? ` · ${s}-day streak` : ""}` : `0 today${best ? ` · best ${best}` : ""}`;
  };

  return (
    <>
      {home && <button type="button" className="ghost small ask-btn" onClick={() => setSheet({ open: true, view: "ask" })}>💡 Request something new</button>}
      {!open && (
        <button type="button" className={`fab${home ? " low" : ""}`} aria-label={`Quick log${left && !missing ? `, ${left} left today` : ""}`} aria-expanded={false} onClick={() => setSheet({ open: true, view: on == null ? "pick" : "log" })}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          {left > 0 && !missing && <span className="fab-badge">{left}</span>}
        </button>
      )}
      {open && (
        <>
          <div className="qk-scrim" onClick={() => setSheet(CLOSED)} />
          <div className="qk" role="dialog" aria-modal="true" aria-label="Quick log">
            {toast && view === "log" && (
              <div className="qk-toast" role="status">
                <span>{toast.text}</span>
                {toast.undo && <button type="button" onClick={() => { setToast(null); undo(toast); }}>Undo</button>}
              </div>
            )}
            <div className="qk-grab" />
            <button type="button" className="qk-x" aria-label="Close" onClick={() => setSheet(CLOSED)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
            {view === "log" && (
              <>
                <div className="qk-head"><h3>Quick log</h3><span className="label">{doneN} of {shown.length} done</span></div>
                <div className="qk-bar">{shown.map((h, i) => <i key={h.id} className={i < doneN ? "on" : ""} />)}</div>
                {missing && <p className="err">Quick log needs a one-time database update. Ask the organizer to run it from the admin panel.</p>}
                {shown.map((h) => (
                  <div key={h.id} className={`qk-row${(vals[h.id] != null || auto(h)) && !(h.kind === "check" && vals[h.id] === 0) ? " done" : ""}`}>
                    <span className="qk-ic" aria-hidden="true">{h.icon}</span>
                    <div className="qk-txt">
                      <b>{h.name}</b><small>{sub(h)}</small>{err[h.id] && <small className="err">{err[h.id]}</small>}
                      {h.kind === "check" && editing !== h.id && <button type="button" className="qk-link" onClick={() => setEditing(h.id)}>{claims[h.id] ? "Edit starting days" : "Add current streak"}</button>}
                    </div>
                    <div className="qk-btns">
                      {h.kind === "count" && h.steps.map((n, i) => (
                        <button key={n} type="button" className={`chip${i === 1 ? " go" : ""}`} disabled={!!busy[h.id] || missing} aria-busy={busy[h.id] === `+${n}`} onClick={() => add(h, n)}>+{n}</button>
                      ))}
                      {h.kind === "check" && (vals[h.id] == null && auto(h)
                        ? h.no && <button type="button" className="chip ghost" disabled={!!busy[h.id] || missing} aria-busy={busy[h.id] === "no"} onClick={() => check(h, false)}>{h.no}</button>
                        : vals[h.id] == null
                        ? <>
                          <button type="button" className="chip acc" disabled={!!busy[h.id] || missing} aria-busy={busy[h.id] === "yes"} onClick={() => check(h, true)}>{h.yes}</button>
                          {h.no && <button type="button" className="chip ghost" disabled={!!busy[h.id] || missing} aria-busy={busy[h.id] === "no"} onClick={() => check(h, false)}>{h.no}</button>}
                        </>
                        : <button type="button" className="chip ghost" disabled={!!busy[h.id]} aria-busy={!!busy[h.id]} onClick={() => run(h, "undo", { set: null }, null)}>Undo</button>)}
                    </div>
                    {editing === h.id && (
                      <Claim id={h.id} name={h.name} claim={claims[h.id]} onDone={(c) => {
                        setEditing("");
                        if (c !== undefined) setClaims(({ [h.id]: _, ...rest }) => (c ? { ...rest, [h.id]: c } : rest));
                      }} />
                    )}
                  </div>
                ))}
                {!shown.length && <p className="note">You aren't following any streak. Tap Pick streaks to choose some.</p>}
                <div className="qk-foot">
                  <button type="button" onClick={() => setSheet({ open: true, view: "ask" })}>💡 Ask organizers</button>
                  <button type="button" onClick={() => setSheet({ open: true, view: "pick" })}>Pick streaks ⚙</button>
                </div>
              </>
            )}
            {view === "pick" && <Pick on={on ?? []} first={on == null} onDone={(o) => { if (o) setOn(o); if (o || on != null) setSheet({ open: true, view: "log" }); else setSheet(CLOSED); }} />}
            {view === "ask" && <Ask onBack={() => (home ? setSheet(CLOSED) : setSheet({ open: true, view: "log" }))} />}
          </div>
        </>
      )}
    </>
  );
}

function Claim({ id, name, claim, onDone }: { id: string; name: string; claim?: StreakClaim; onDone: (c?: StreakClaim | null) => void }) {
  const [days, setDays] = useState(claim ? String(claim.days) : "");
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const save = async (n: number) => {
    setSaving(n ? "save" : "clear"); setError("");
    const r = await setStreakClaim(id, n).catch(() => ({ error: "Couldn't save. Check your connection." }) as { error?: string });
    setSaving("");
    if (r.error) setError(r.error); else onDone(n ? { days: n, on: today() } : null);
  };
  const n = Number(days);
  const ok = Number.isInteger(n) && n >= 1 && n <= 3650;
  return (
    <form className="qk-claim" onSubmit={(e) => { e.preventDefault(); if (ok) save(n); }}>
      <label htmlFor={`claim-${id}`}>How many days clean are you, counting today? {name} will keep counting up every day from there. Tap Slipped if you slip.</label>
      <div className="qk-claim-row">
        <input id={`claim-${id}`} type="number" inputMode="numeric" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} placeholder="Days" autoFocus />
        <button type="submit" className="chip acc" disabled={!ok || !!saving} aria-busy={saving === "save"}>Save</button>
        {claim && <button type="button" className="chip ghost" disabled={!!saving} aria-busy={saving === "clear"} onClick={() => save(0)}>Remove</button>}
        <button type="button" className="chip ghost" disabled={!!saving} onClick={() => onDone()}>Cancel</button>
      </div>
      {error && <small className="err">{error}</small>}
    </form>
  );
}

function Pick({ on, first, onDone }: { on: string[]; first: boolean; onDone: (on?: string[]) => void }) {
  const [sel, setSel] = useState(on);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setSaving(true); setError("");
    const r = await setHabitsOn(sel).catch(() => ({ error: "Couldn't save. Check your connection." }) as { error?: string });
    setSaving(false);
    if (r.error) setError(r.error); else onDone(sel);
  };
  return (
    <>
      <div className="qk-head"><h3>{first ? "Pick your streaks" : "Your streaks"}</h3></div>
      <p className="note">Choose the ones you'll follow every day. You'll show up on the Streaks board for each one (Ranks tab). Change them any time. Want one that isn't here? Ask the organizers.</p>
      {HABITS.map((h) => (
        <label key={h.id} className="qk-row qk-pick">
          <span className="qk-ic" aria-hidden="true">{h.icon}</span>
          <div className="qk-txt"><b>{h.name}</b></div>
          <input type="checkbox" checked={sel.includes(h.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, h.id] : s.filter((x) => x !== h.id)))} />
        </label>
      ))}
      {error && <p className="err">{error}</p>}
      <div className="qk-actions">
        <button type="button" className="ghost" onClick={() => onDone()}>{first ? "Later" : "Back"}</button>
        <button type="button" disabled={saving || (first && !sel.length)} aria-busy={saving} onClick={save}>{saving ? "Saving…" : first ? "Start following" : "Save"}</button>
      </div>
    </>
  );
}

function Ask({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const send = async () => {
    setSending(true); setMsg({});
    const r: { ok?: string; error?: string } = await sendRequest(text).catch(() => ({ error: "Couldn't send. Check your connection." }));
    setSending(false); setMsg(r);
    if (r.ok) setText("");
  };
  return (
    <>
      <div className="qk-head"><h3>Ask the organizers</h3></div>
      <p className="note">A new habit to log, a new event, a feature, a complaint. They'll see it in their panel.</p>
      <textarea rows={3} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a plank timer to the quick log" aria-label="Your request" />
      {msg.error && <p className="err">{msg.error}</p>}
      {msg.ok && <p className="ok">{msg.ok}</p>}
      <div className="qk-actions">
        <button type="button" className="ghost" onClick={onBack}>Back</button>
        <button type="button" disabled={sending || text.trim().length < 3} aria-busy={sending} onClick={send}>{sending ? "Sending…" : "Send"}</button>
      </div>
    </>
  );
}
