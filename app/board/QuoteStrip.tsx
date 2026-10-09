"use client";
import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitQuote } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" className="small" disabled={pending}>{pending ? "Adding…" : "Add"}</button>;
}

/** One bro talk quote a day, plus a tucked-away box to add your own. */
export default function QuoteStrip({ text, author, canAdd }: { text: string; author: string | null; canAdd: boolean }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(async (prev: unknown, fd: FormData) => {
    const r = await submitQuote(prev, fd);
    if (r && "ok" in r) ref.current?.reset();
    return r;
  }, null as null | { ok?: string; error?: string });
  return (
    <div className="quote">
      <span className="label">Bro talk of the day</span>
      <p>“{text}”{author && <span> · {author}</span>}</p>
      {canAdd && (
        <details>
          <summary>Add your own</summary>
          <form ref={ref} action={action}>
            <input name="quote" maxLength={220} required placeholder="Something you'd shout at a friend on mile 9" aria-label="Your bro talk" />
            <Submit />
          </form>
          {state?.error && <p className="err">{state.error}</p>}
          {state?.ok && <p className="ok">{state.ok}</p>}
        </details>
      )}
    </div>
  );
}
