"use client";
import { useFormState, useFormStatus } from "react-dom";
import { acceptInvite } from "./actions";
import { BasicFields } from "@/components/ProfileFields";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} onClick={(e) => { if (e.currentTarget.form?.checkValidity()) window.dispatchEvent(new Event("confetti")); }}>{pending ? "Saving…" : "I'm in"}</button>;
}

export default function AcceptForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useFormState(acceptInvite, null as null | { error?: string });
  return (
    <form className="card join" action={action}>
      <div className="grid2">
        <div className="field">
          <label htmlFor="nickname">Name on the leaderboard</label>
          <input id="nickname" name="nickname" defaultValue={defaultName} maxLength={28} required placeholder="Pick something legendary" />
        </div>
        <div className="field">
          <label htmlFor="password">Choose a password</label>
          <input id="password" name="password" type="password" minLength={6} required autoComplete="new-password" placeholder="6+ characters, for signing in" />
        </div>
      </div>
      <BasicFields />
      <Submit />
      {state?.error && <p className="err">{state.error}</p>}
      <p className="note">That's it. Add more roast fuel later from your profile.</p>
    </form>
  );
}
