"use client";
import { useFormState, useFormStatus } from "react-dom";
import { saveProfile } from "../actions";
import ProfileFields from "@/components/ProfileFields";
import type { Profile } from "@/lib/profile.ts";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save my fighter"}</button>;
}

export default function ProfileForm(props: { profile: Profile | null; catchphrase: string | null; rivals: { id: string; name: string }[] }) {
  const [state, action] = useFormState(saveProfile, null as null | { ok?: string; error?: string });
  return (
    <form className="card" action={action}>
      <ProfileFields {...props} />
      <div className="field">
        <label htmlFor="password">New password (optional)</label>
        <input id="password" name="password" type="password" minLength={6} autoComplete="new-password" placeholder="Leave empty to keep your current one" />
      </div>
      <Submit />
      {state?.error && <p className="err">{state.error}</p>}
      {state?.ok && <p className="ok">{state.ok}</p>}
    </form>
  );
}
