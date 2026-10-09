"use client";
import { useFormState, useFormStatus } from "react-dom";
import { acceptInvite } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} onClick={() => window.dispatchEvent(new Event("confetti"))}>{pending ? "Saving…" : "I'm in"}</button>;
}

export default function AcceptForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useFormState(acceptInvite, null as null | { error?: string });
  return (
    <form className="card" action={action}>
      <div className="field">
        <label htmlFor="nickname">Name on the leaderboard</label>
        <input id="nickname" name="nickname" defaultValue={defaultName} maxLength={28} required placeholder="Pick something legendary" />
      </div>
      <div className="field">
        <label htmlFor="catchphrase">Your catchphrase</label>
        <input id="catchphrase" name="catchphrase" maxLength={80} placeholder="Your fighter shouts this in the arena" />
      </div>
      <Submit />
      {state?.error ? <p className="err">{state.error}</p> : <p className="note">This is how everyone will see you in the arena and on the board.</p>}
    </form>
  );
}
