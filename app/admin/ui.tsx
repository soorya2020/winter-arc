"use client";
import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addParticipant, addQuote, removeQuote, broadcast, emailInvite, login, removeParticipant, saveResult, sendRemindersNow } from "./actions";

type Msg = { ok?: string; error?: string } | null;
const Note = ({ m }: { m: Msg }) => (m?.error ? <p className="err">{m.error}</p> : m?.ok ? <p className="ok">{m.ok}</p> : null);

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Working…" : children}</button>;
}

export function LoginForm() {
  const [m, action] = useFormState(login, null as Msg);
  return (
    <form className="card" action={action}>
      <div className="field"><label htmlFor="password">Admin password</label><input id="password" name="password" type="password" required autoFocus /></div>
      <Submit>Sign in</Submit>
      <Note m={m} />
    </form>
  );
}

export function AddForm() {
  const [m, action] = useFormState(async (p: Msg, fd: FormData) => {
    const r = await addParticipant(p, fd);
    if (r?.ok) (document.getElementById("add-form") as HTMLFormElement | null)?.reset();
    return r;
  }, null as Msg);
  return (
    <form id="add-form" className="card" action={action}>
      <h3 style={{ fontSize: "1rem", textTransform: "uppercase" }}>Add an invitee</h3>
      <div className="field"><label htmlFor="p-name">Name</label><input id="p-name" name="name" required /></div>
      <div className="field"><label htmlFor="p-email">Email</label><input id="p-email" name="email" type="email" required /></div>
      <Submit>Add to the list</Submit>
      <Note m={m} />
    </form>
  );
}

export function InviteControls({ id, link, sent }: { id: string; link: string; sent: boolean }) {
  const [m, setM] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setM({ ok: "Link copied" }); } catch { setM({ ok: link }); }
  };
  return (
    <div style={{ display: "grid", gap: ".35rem" }}>
      <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
        <button className="small" disabled={pending} onClick={() => start(async () => setM(await emailInvite(id)))}>{pending ? "Sending…" : sent ? "Resend email" : "Email invite"}</button>
        <button className="ghost small" onClick={copy}>Copy link</button>
      </div>
      <Note m={m} />
    </div>
  );
}

export function RemoveButton({ id, name }: { id: string; name: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (!confirm) return <button className="ghost small" onClick={() => setConfirm(true)}>Remove</button>;
  return (
    <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", alignItems: "center" }}>
      <span className="note">Remove {name} and their results?</span>
      <button className="small" style={{ background: "var(--bad)" }} disabled={pending} onClick={() => start(() => removeParticipant(id))}>Yes, remove</button>
      <button className="ghost small" onClick={() => setConfirm(false)}>Keep</button>
    </div>
  );
}

export function ReminderButton() {
  const [m, setM] = useState<Msg>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button disabled={pending} onClick={() => start(async () => setM(await sendRemindersNow()))}>{pending ? "Sending…" : "Send today's reminder now"}</button>
      <Note m={m} />
    </>
  );
}

export function ResultCell(props: { participantId: string; eventId: string; baseline: boolean; initial: string; initialPoints: number | null; placeholder: string; label?: string }) {
  const [value, setValue] = useState(props.initial);
  const [saved, setSaved] = useState(props.initial);
  const [pts, setPts] = useState(props.initialPoints);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const save = () => {
    if (value === saved) return;
    start(async () => {
      const r = await saveResult(props.participantId, props.eventId, props.baseline, value);
      if (r.error) { setErr(r.error); return; }
      setErr(null); setSaved(value); setPts(r.points ?? null);
    });
  };
  // Enter (Next on a phone keyboard) saves and moves to the next person's box.
  const next = (el: HTMLInputElement) => {
    const all = [...document.querySelectorAll<HTMLInputElement>("input[data-result]")];
    const n = all[all.indexOf(el) + 1];
    if (n) n.focus(); else el.blur();
  };
  const state = pending ? "Saving…" : err ?? (pts != null ? `${pts} pts` : value !== saved ? "Not saved" : "");
  return (
    <div className="rcell">
      <input data-result value={value} placeholder={props.placeholder} inputMode="decimal" enterKeyHint="next" aria-label={props.label ?? "Result"}
        className={pts != null && value === saved && !err ? "done" : undefined}
        onChange={(e) => setValue(e.target.value)} onBlur={save} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); next(e.target as HTMLInputElement); } }} />
      <span className={err ? "err" : "pts"} aria-live="polite">{state}</span>
    </div>
  );
}

export function Broadcast({ counts }: { counts: { accepted: number; pending: number; all: number } }) {
  const [audience, setAudience] = useState<"accepted" | "pending" | "all">("accepted");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [m, setM] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const n = counts[audience];
  const run = (testOnly: boolean) => start(async () => {
    const r = await broadcast(audience, subject, message, testOnly);
    setM(r); setConfirm(false);
    if (r?.ok && !testOnly) { setSubject(""); setMessage(""); }
  });
  return (
    <div className="panel" style={{ maxWidth: "44rem" }}>
      <div className="field">
        <label htmlFor="b-audience">Send to</label>
        <select id="b-audience" value={audience} onChange={(e) => { setAudience(e.target.value as typeof audience); setConfirm(false); }}>
          <option value="accepted">Everyone who accepted ({counts.accepted})</option>
          <option value="pending">Invited but not accepted yet ({counts.pending})</option>
          <option value="all">Everyone on the list ({counts.all})</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="b-subject">Subject</label>
        <input id="b-subject" value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} placeholder="Running weekend moved to 3 January" />
      </div>
      <div className="field">
        <label htmlFor="b-message">Message</label>
        <textarea id="b-message" value={message} maxLength={5000} rows={8} onChange={(e) => setMessage(e.target.value)} style={{ borderRadius: 14 }}
          placeholder={"Leave a blank line between paragraphs.\n\nEach person's email starts with \"Hey <name>,\" and ends with a button back to the site."} />
      </div>
      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "center" }}>
        {!confirm
          ? <button type="button" disabled={pending || !subject.trim() || !message.trim()} onClick={() => setConfirm(true)}>Send to {n} {n === 1 ? "person" : "people"}</button>
          : <>
              <span className="note">Send "{subject}" to {n} {n === 1 ? "person" : "people"}? This can't be unsent.</span>
              <button type="button" disabled={pending} onClick={() => run(false)} style={{ background: "var(--accent)" }}>{pending ? "Sending…" : "Yes, send it"}</button>
              <button type="button" className="ghost" onClick={() => setConfirm(false)}>Cancel</button>
            </>}
        {!confirm && <button type="button" className="ghost" disabled={pending || !subject.trim() || !message.trim()} onClick={() => run(true)}>Send me a test</button>}
      </div>
      <Note m={m} />
    </div>
  );
}

export function QuoteForm() {
  const [m, action] = useFormState(async (p: Msg, fd: FormData) => {
    const r = await addQuote(p, fd);
    if (r?.ok) (document.getElementById("quote-form") as HTMLFormElement | null)?.reset();
    return r;
  }, null as Msg);
  return (
    <form id="quote-form" className="card" action={action} style={{ maxWidth: "44rem" }}>
      <div className="field"><label htmlFor="q-text">Bro talk</label><textarea id="q-text" name="text" maxLength={220} rows={3} required style={{ borderRadius: 14 }} placeholder="Abs are made in the kitchen, but you're still doing the planks." /></div>
      <div className="field"><label htmlFor="q-author">Who said it (optional)</label><input id="q-author" name="author" maxLength={40} placeholder="Rahul, 2am, after biryani" /></div>
      <Submit>Add to the rotation</Submit>
      <Note m={m} />
    </form>
  );
}

export function RemoveQuote({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return <button className="ghost small" disabled={pending} onClick={() => start(() => removeQuote(id))}>Remove</button>;
}
