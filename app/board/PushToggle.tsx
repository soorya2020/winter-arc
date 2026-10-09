"use client";
import { useEffect, useState } from "react";
import { pushPublicKey, subscribePush, unsubscribePush } from "../actions";

// Daily reminders as phone notifications. iPhones only allow this once Winter Arc is
// added to the home screen and opened from there (iOS 16.4 or newer).

type State = "loading" | "unsupported" | "ios-install" | "off" | "on" | "blocked";

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export default function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState(ios && !standalone ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") { setState("blocked"); return; }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    }).catch(() => setState("unsupported"));
  }, []);

  const turnOn = async () => {
    setBusy(true); setMsg(null);
    try {
      const key = await pushPublicKey();
      if (!key) { setMsg("Notifications aren't set up on the site yet. Ask the organizer."); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "blocked" : "off"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) });
      const r = await subscribePush(JSON.parse(JSON.stringify(sub)));
      if (r.error) { setMsg(r.error); await sub.unsubscribe(); return; }
      setState("on"); setMsg("Done. A test notification is on its way.");
    } catch {
      setMsg("Your phone didn't allow it. Try again, or check notification settings for this site.");
    } finally { setBusy(false); }
  };

  const turnOff = async () => {
    setBusy(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { await unsubscribePush(sub.endpoint); await sub.unsubscribe(); }
    setState("off"); setMsg(null); setBusy(false);
  };

  if (state === "loading" || state === "unsupported") return null;
  return (
    <div className={`push${state === "on" ? " on" : ""}`}>
      <span className="push-ico" aria-hidden="true">🔔</span>
      <div className="push-txt">
        {state === "on" && <><b>Daily reminders are on</b><span>They arrive on this phone at 6 AM.</span></>}
        {state === "off" && <><b>Get your daily reminder as a notification</b><span>Today's session, your streak and days left, at 6 AM. No more digging through email.</span></>}
        {state === "ios-install" && <><b>Want daily reminders on your iPhone?</b><span>Tap Share, then Add to Home Screen. Open Winter Arc from your home screen and turn them on here.</span></>}
        {state === "blocked" && <><b>Notifications are blocked</b><span>Allow them for this site in your phone's settings, then reload.</span></>}
        {msg && <span className="push-msg">{msg}</span>}
      </div>
      {state === "off" && <button type="button" disabled={busy} onClick={turnOn}>{busy ? "Turning on…" : "Turn on"}</button>}
      {state === "on" && <button type="button" className="ghost small" disabled={busy} onClick={turnOff}>Turn off</button>}
    </div>
  );
}
