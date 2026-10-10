"use client";
import { useState } from "react";
import { offerDosa } from "../actions";
import { DOSAS, type DosaKind } from "@/lib/profile.ts";

// "Buy me a masala dosa": a free, virtual thank-you for the organiser. No money, no food.

type Donor = { id: string; name: string; count: number; icon: string };

export default function DosaCard({ total, wall, offeredToday, meId, meName }: { total: number; wall: Donor[]; offeredToday: boolean; meId: string; meName: string }) {
  const [kind, setKind] = useState<DosaKind>("masala");
  const [count, setCount] = useState(total);
  const [donors, setDonors] = useState(wall);
  const [done, setDone] = useState(offeredToday);
  const [justDone, setJustDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const offer = async () => {
    setBusy(true); setMsg(null);
    const r = await offerDosa(kind);
    setBusy(false);
    if (r.error) { setMsg(r.error); return; }
    window.dispatchEvent(new Event("confetti"));
    setCount((n) => n + 1);
    setDonors((d) => {
      const mine = d.find((x) => x.id === meId);
      return mine ? d.map((x) => (x.id === meId ? { ...x, count: x.count + 1 } : x)) : [...d, { id: meId, name: meName, count: 1, icon: DOSAS[kind].icon }];
    });
    setDone(true); setJustDone(true);
  };

  return (
    <section id="dosa">
      <div className="head">
        <span className="label">Say thanks · free</span>
        <h2>Buy me a <em>masala dosa</em></h2>
      </div>
      {justDone ? (
        <div className="dosa dosa-done" role="status">
          <span className="dosa-big" aria-hidden="true">{DOSAS[kind].icon}</span>
          <h3>Dosa received, machane!</h3>
          <p>Chutney-um sambar-um extra. Organiser ippo full happy aanu. 🔥</p>
          <p className="note">Ninte peru Dosa wall-il keri. Naale veendum offer cheyyaam.</p>
          <button type="button" className="ghost small" onClick={() => setJustDone(false)}>Back to the wall</button>
        </div>
      ) : (
        <div className="dosa">
          <p className="dosa-why">Ee arc nadathunna machan-nu oru thanks parayaan thonniyaal, oru dosa offer cheyyu. Ithu fully free aanu. Oru click, athra thanne.</p>
          <div className="dosa-count"><b>{count}</b><span>{count === 1 ? "dosa" : "dosas"} offered so far</span></div>
          {!done && (
            <>
              <div className="dosa-opts" role="radiogroup" aria-label="Pick your dosa">
                {(Object.keys(DOSAS) as DosaKind[]).map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>
                    <i aria-hidden="true">{DOSAS[k].icon}</i>{DOSAS[k].label}
                  </button>
                ))}
              </div>
              <button type="button" className="dosa-go" disabled={busy} onClick={offer}>{busy ? "Serving…" : `Offer a ${DOSAS[kind].label.toLowerCase()} ${DOSAS[kind].icon}`}</button>
            </>
          )}
          {done && <p className="dosa-msg">Innathe dosa kitti, thanks machane! Naale veendum vaa. 🫓</p>}
          {msg && <p className="err">{msg}</p>}
          <p className="dosa-disc">⚠️ <b>Real paisa alla, real dosa alla.</b> No payment, no food. Just a gesture of gratitude, machane.</p>
          {donors.length > 0 && (
            <div className="dosa-wall">
              <b>Dosa wall</b>
              <div>{donors.map((d) => <span key={d.id}>{d.name} {d.icon}{d.count > 1 ? `×${d.count}` : ""}</span>)}</div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
