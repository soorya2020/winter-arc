"use client";
import { useFormState, useFormStatus } from "react-dom";
import { resendLink, signIn } from "./actions";

function Submit({ idle, busy, ghost }: { idle: string; busy: string; ghost?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={ghost ? "ghost small" : undefined} disabled={pending}>{pending ? busy : idle}</button>;
}

/** Members sign in with email and password. Forgot it? Get a one-tap sign-in link by email. */
export default function LinkForm() {
  const [login, loginAction] = useFormState(signIn, null as null | { error?: string });
  const [link, linkAction] = useFormState(resendLink, null as null | { ok?: string; error?: string });
  return (
    <div className="panel">
      <h3 style={{ fontSize: "1.4rem" }}>Members sign in</h3>
      <form action={loginAction} style={{ display: "grid", gap: ".75rem" }}>
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" name="email" type="email" required autoComplete="email" placeholder="you@gmail.com" />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <Submit idle="Sign in" busy="Signing in…" />
        {login?.error && <p className="err">{login.error}</p>}
      </form>
      <details>
        <summary className="note" style={{ cursor: "pointer" }}>Forgot your password, or haven't set one yet?</summary>
        <form action={linkAction} style={{ display: "grid", gap: ".5rem", marginTop: ".5rem" }}>
          <p className="note">We'll email you a link that signs you straight in. You can set a new password on your profile page.</p>
          <input name="email" type="email" required autoComplete="email" placeholder="you@gmail.com" aria-label="Your email" />
          <Submit idle="Email me a sign-in link" busy="Sending…" ghost />
          {link?.error && <p className="err">{link.error}</p>}
          {link?.ok && <p className="ok">{link.ok}</p>}
        </form>
      </details>
    </div>
  );
}
