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
      <p className="note">We're all friends here, so answer honestly. Your fighter talks like you, and everyone else gets material to roast you with. You can change your answers later.</p>
      <ProfileFields rivals={rivals} />
      <Submit />
      {state?.error && <p className="err">{state.error}</p>}
    </form>
  );
}
