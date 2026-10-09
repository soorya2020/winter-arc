"use client";
import { useState } from "react";

/** One tap to brag in the WhatsApp group: your rank as text, or your poster as an image. */
export default function ShareButtons({ id, rank, total, streak, site }: { id: string; rank: number; total: number; streak: number; site: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const text = `I'm #${rank} in Winter Arc 2026 with ${total} points and a ${streak}-day streak. Vidilla machane 💪 ${site}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;

  async function sharePoster() {
    setMsg(null);
    try {
      const res = await fetch(`/api/poster/${id}`);
      if (!res.ok) throw new Error();
      const file = new File([await res.blob()], "winter-arc-poster.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      // Desktop browsers can't hand an image to WhatsApp, so save it and open the chat.
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file); a.download = file.name; a.click();
      setMsg("Poster saved. Attach it in the WhatsApp chat that just opened.");
      window.open(wa, "_blank", "noopener");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setMsg("Couldn't load your poster. Try again.");
    }
  }

  return (
    <div className="share">
      <a className="wa" href={wa} target="_blank" rel="noopener noreferrer">Share my rank on WhatsApp</a>
      {total > 0 && <button type="button" className="wa ghost" onClick={sharePoster}>Share my poster</button>}
      {msg && <p className="note">{msg}</p>}
    </div>
  );
}
