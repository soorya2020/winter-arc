"use client";
import { useFormState, useFormStatus } from "react-dom";
import { acceptInvite } from "./actions";
import ProfileFields from "@/components/ProfileFields";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} onClick={() => window.dispatchEvent(new Event("confetti"))}>{pending ? "Saving…" : "I'm in"}</button>;
}

export default function AcceptForm({ defaultName, rivals }: { defaultName: string; rivals: { id: string; name: string }[] }) {
  const [state, action] = useFormState(acceptInvite, null as null | { error?: string });
  return (
    <form className="card" action={action}>
      <div className="field">
        <label htmlFor="nickname">Name on the leaderboard</label>
        <input id="nickname" name="nickname" defaultValue={defaultName} maxLength={28} required placeholder="Pick something legendary" />
      </div>
      <p className="note">Answer a few questions so your fighter talks like you, and so everyone else knows exactly what to roast. All optional, and you can change them later.</p>
      <ProfileFields rivals={rivals} />
      <Submit />
      {state?.error && <p className="err">{state.error}</p>}
    </form>
  );
}
