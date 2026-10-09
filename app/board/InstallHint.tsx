"use client";
import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "wa-install-hint-dismissed";

/** A small nudge to put Winter Arc on the home screen. Android gets a real Install button; iPhone gets the two taps to do it. */
export default function InstallHint() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === "1"; } catch {}
    if (standalone || dismissed) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios) setMode("ios");
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as PromptEvent); setMode("android"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const close = () => { setMode(null); try { localStorage.setItem(KEY, "1"); } catch {} };
  if (!mode) return null;

  return (
    <div className="install" role="region" aria-label="Add to home screen">
      <img src="/icon-192.png" alt="" width={44} height={44} />
      <div>
        <b>Put Winter Arc on your home screen</b>
        {mode === "ios"
          ? <span>Tap the Share button <span aria-hidden="true">⬆︎</span>, then <b>Add to Home Screen</b>. It opens full screen like an app.</span>
          : <span>One tap and it opens full screen like an app.</span>}
      </div>
      {mode === "android" && prompt && (
        <button type="button" className="small" onClick={async () => { await prompt.prompt(); await prompt.userChoice; close(); }}>Install</button>
      )}
      <button type="button" className="ghost small" onClick={close} aria-label="Dismiss">✕</button>
    </div>
  );
}
