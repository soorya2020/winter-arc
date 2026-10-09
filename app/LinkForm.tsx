"use client";
import { useFormState, useFormStatus } from "react-dom";
import { resendLink } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Sending…" : "Email my link"}</button>;
}

/** For invitees on a new phone or browser: get the personal link emailed again. */
export default function LinkForm() {
  const [state, action] = useFormState(resendLink, null as null | { ok?: string; error?: string });
  return (
    <form className="card" action={action}>
      <h3 style={{ fontSize: "1.4rem" }}>Already invited?</h3>
      <p className="note">Your personal link is how you sign in. Enter the email your invite went to and we'll send it again.</p>
      <div className="field">
        <label htmlFor="link-email">Your email</label>
        <input id="link-email" name="email" type="email" required autoComplete="email" placeholder="you@gmail.com" />
      </div>
      <Submit />
      {state?.error && <p className="err">{state.error}</p>}
      {state?.ok && <p className="ok">{state.ok}</p>}
    </form>
  );
}
