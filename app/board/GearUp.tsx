"use client";
import { useEffect, useState } from "react";
import { buzzMe, lockIn, markInstalled, pushPublicKey, subscribePush } from "../actions";

// "Gear up": three steps every member does once. Install the app, allow notifications,
// take a test buzz. Finishing it puts a lock next to their name on the board.
// iPhones only allow notifications from the installed app (iOS 16.4+), so install comes first there.

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Device = "ios" | "android" | "desktop";
const LINES = [
  "Locked in, machane. Ini excuses illa. 🔒",
  "Phone ready, body ready. Mazha aanel polum nee varum. 🔒",
  "Ninte alarm ini njangala. Locked in. 🔒",
];

const toKey = (b64: string) => {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
const cheer = () => window.dispatchEvent(new Event("confetti"));

export default function GearUp({ installed: wasInstalled, lockedIn: wasLocked, name }: { installed: boolean; lockedIn: boolean; name: string }) {
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [standalone, setStandalone] = useState(false);
  const [installed, setInstalled] = useState(wasInstalled);
  const [skipInstall, setSkipInstall] = useState(false);
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [push, setPush] = useState<"off" | "on" | "blocked" | "none">("off");
  const [buzzed, setBuzzed] = useState(false);
  const [locked, setLocked] = useState(wasLocked);
  const [justLocked, setJustLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const d: Device = /iphone|ipad|ipod/i.test(ua) ? "ios" : /android/i.test(ua) ? "android" : "desktop";
    const sa = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    setDevice(d); setStandalone(sa);
    if (sa) { setInstalled(true); if (!wasInstalled) markInstalled(); }
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as PromptEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => { setInstalled(true); markInstalled(); cheer(); };
    window.addEventListener("appinstalled", onInstalled);
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) setPush("none");
      else if (Notification.permission === "denied") setPush("blocked");
      else {
        const reg = await navigator.serviceWorker.register("/sw.js").catch(() => null);
        const sub = reg && (await reg.pushManager.getSubscription());
        setPush(sub ? "on" : "off");
      }
      setReady(true);
    })();
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, [wasInstalled]);

  if (!ready || (locked && !justLocked)) return null;

  const step1 = installed || skipInstall || standalone;
  const step2 = push === "on";
  const done = [step1, step2, buzzed || locked].filter(Boolean).length;

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const r = await prompt.userChoice;
    if (r.outcome === "accepted") { setInstalled(true); markInstalled(); cheer(); }
  };
  const allow = async () => {
    setBusy(true); setMsg(null);
    try {
      const key = await pushPublicKey();
      if (!key) { setMsg("Notifications aren't switched on for the site yet. Ping the organizer."); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPush(perm === "denied" ? "blocked" : "off"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) });
      const r = await subscribePush(JSON.parse(JSON.stringify(sub)));
      if (r.error) { setMsg(r.error); await sub.unsubscribe(); return; }
      setPush("on"); cheer();
    } catch {
      setMsg("Your phone said no. Try again, or allow notifications for this site in settings.");
    } finally { setBusy(false); }
  };
  const buzz = async () => {
    setBusy(true); setMsg(null);
    const r = await buzzMe();
    setBusy(false);
    if (r.error) setMsg(r.error); else { setBuzzed(true); setMsg("Buzz sent. Felt it? Tap Got it."); }
  };
  const confirm = async () => {
    await lockIn();
    setJustLocked(true); setLocked(true); cheer();
  };

  if (justLocked) {
    return (
      <div className="gear done" id="gear" role="status">
        <span className="gear-lock" aria-hidden="true">🔒</span>
        <div><b>{name}, you're Locked In</b><span>{LINES[name.length % LINES.length]} The lock now shows next to your name on the board.</span></div>
        <button type="button" className="ghost small" onClick={() => setJustLocked(false)}>Nice</button>
      </div>
    );
  }

  const iosNeedsInstall = device === "ios" && !standalone;
  return (
    <section className="gear" id="gear" aria-label="Gear up">
      <div className="gear-head">
        <div><span className="label">Before the arc starts</span><h3>Gear <em>up</em></h3></div>
        <div className="gear-meter" aria-label={`${done} of 3 done`}>{[0, 1, 2].map((i) => <i key={i} className={i < done ? "on" : ""} />)}</div>
      </div>
      <p className="gear-why">Three quick steps so the arc can reach you every morning. Finish them to get the 🔒 next to your name.</p>
      <p className="gear-must"><b>Compulsory aanu, machane.</b> "Later" button njangal eduthu kalanju. Gear up cheyyaathe ivide ninnu rakshapedaan pattilla 😤</p>
      <ol className="gear-steps">
        <li className={step1 ? "fin" : "now"}>
          <span className="gear-n">{step1 ? "✓" : "1"}</span>
          <div>
            <b>Install the app</b>
            {step1 ? <span>Done. Winter Arc lives on your home screen.</span>
              : device === "ios" ? <span>In Safari, tap Share <span aria-hidden="true">⬆︎</span>, then <b>Add to Home Screen</b>. Then open Winter Arc from your home screen and come back here.</span>
              : prompt ? <span>One tap. It opens full screen like a real app.</span>
              : device === "android" ? <span>In Chrome, tap the ⋮ menu, then <b>Install app</b> (or Add to Home screen).</span>
              : <span>On a laptop this is optional. On your phone it's the real deal.</span>}
            {!step1 && (
              <div className="gear-btns">
                {prompt && <button type="button" onClick={install}>Install</button>}
                {device !== "ios" && <button type="button" className="ghost small" onClick={() => setSkipInstall(true)}>{device === "desktop" ? "Skip on laptop" : "Done it"}</button>}
              </div>
            )}
          </div>
        </li>
        <li className={step2 ? "fin" : step1 ? "now" : ""}>
          <span className="gear-n">{step2 ? "✓" : "2"}</span>
          <div>
            <b>Allow notifications</b>
            {step2 ? <span>Done. Your 6 AM reminder lands on this phone.</span>
              : iosNeedsInstall || push === "none" ? <span>Unlocks after step 1. iPhones only allow it from the installed app.</span>
              : push === "blocked" ? <span>Blocked for this site. Allow notifications in your phone settings, then reload.</span>
              : <span>Your daily session, streak and days left, at 6 AM. No email digging.</span>}
            {!step2 && step1 && push === "off" && <div className="gear-btns"><button type="button" disabled={busy} onClick={allow}>{busy ? "Asking…" : "Allow"}</button></div>}
          </div>
        </li>
        <li className={buzzed ? "fin" : step2 ? "now" : ""}>
          <span className="gear-n">{buzzed ? "✓" : "3"}</span>
          <div>
            <b>Take a test buzz</b>
            <span>{buzzed ? "Felt it? Lock it in." : "We'll ping your phone once to make sure it works."}</span>
            {step2 && (
              <div className="gear-btns">
                {!buzzed && <button type="button" disabled={busy} onClick={buzz}>{busy ? "Buzzing…" : "Buzz me"}</button>}
                {buzzed && <button type="button" onClick={confirm}>Got it 🔒</button>}
                {buzzed && <button type="button" className="ghost small" disabled={busy} onClick={buzz}>Buzz again</button>}
              </div>
            )}
          </div>
        </li>
      </ol>
      {msg && <p className="gear-msg" aria-live="polite">{msg}</p>}
    </section>
  );
}
