"use client";
import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { logPractice } from "../actions";
import { PRACTICE_KINDS } from "@/lib/season.ts";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Logging…" : "Log today's session"}</button>;
}

export default function PracticeForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(async (prev: unknown, fd: FormData) => {
    const r = await logPractice(prev, fd);
    if (r && "ok" in r) { ref.current?.reset(); window.dispatchEvent(new Event("confetti")); }
    return r;
  }, null as null | { ok?: string; error?: string });
  return (
    <form ref={ref} className="card" action={action}>
      <div className="grid2">
        <div className="field">
          <label htmlFor="kind">What did you train?</label>
          <select id="kind" name="kind" defaultValue="Run">{PRACTICE_KINDS.map((k) => <option key={k}>{k}</option>)}</select>
        </div>
        <div className="field">
          <label htmlFor="minutes">Minutes</label>
          <input id="minutes" name="minutes" type="number" min={1} max={600} defaultValue={30} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="note">Note (optional)</label>
        <input id="note" name="note" maxLength={200} placeholder="5 km in 31 min, legs heavy" />
      </div>
      <Submit />
      {state?.error && <p className="err">{state.error}</p>}
      {state?.ok && <p className="ok">{state.ok}</p>}
    </form>
  );
}
