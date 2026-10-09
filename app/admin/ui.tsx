"use client";
import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addParticipant, emailInvite, login, removeParticipant, saveResult, sendRemindersNow } from "./actions";

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

export function ResultCell(props: { participantId: string; eventId: string; baseline: boolean; initial: string; initialPoints: number | null; placeholder: string }) {
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
  return (
    <div style={{ display: "grid", gap: ".2rem" }}>
      <input value={value} placeholder={props.placeholder} inputMode="decimal" aria-label="Result"
        onChange={(e) => setValue(e.target.value)} onBlur={save} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
      <span className={err ? "err" : "pts"} style={{ fontSize: ".72rem" }}>{pending ? "Saving…" : err ?? (pts != null ? `${pts} pts` : value !== saved ? "Not saved" : "")}</span>
    </div>
  );
}
