"use client";
import { useEffect, useRef } from "react";

/** A button that opens the sign in (or claim your spot) form in a pop-up. Links to /#join open it too. */
export default function AuthPopup({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = () => ref.current?.showModal();
  useEffect(() => { if (location.hash === "#join") open(); }, []);
  return (
    <>
      <button type="button" className="cta wide" onClick={open}>{label} <span>→</span></button>
      <dialog ref={ref} className="sheet" aria-label={title} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
        <div className="sheet-in">
          <div className="sheet-top">
            <h2>{title}</h2>
            <button type="button" className="ghost small" onClick={() => ref.current?.close()} aria-label="Close">✕</button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
