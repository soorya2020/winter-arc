import { notFound, redirect } from "next/navigation";
import { currentParticipant, isAdmin } from "@/lib/auth";
import { loadBoard } from "@/lib/board";
import { EVENTS, SEASON, TZ } from "@/lib/season.ts";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function Certificate({ params }: { params: { id: string } }) {
  const me = await currentParticipant();
  if (!isAdmin() && me?.id !== params.id) redirect("/");
  const rows = await loadBoard();
  const r = rows.find((x) => x.id === params.id);
  if (!r) notFound();
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(new Date(SEASON.awards));
  return (
    <div style={{ padding: "24px 16px", display: "grid", gap: "1rem", justifyItems: "center" }}>
      <style>{`@page { size: A4 landscape; margin: 0 } @media print { body { background: #120a2e; -webkit-print-color-adjust: exact; print-color-adjust: exact } .cert { box-shadow: none !important } }`}</style>
      <div className="noprint"><PrintButton /></div>
      <div className="cert">
        <div style={{ position: "absolute", right: "-8%", top: "-30%", width: "55%", aspectRatio: "1", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,61,139,.45), transparent 65%)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", position: "relative" }}>
          <span className="label" style={{ color: "var(--cyan)" }}>Certificate of completion</span>
          <span className="label">{SEASON.name}</span>
        </div>
        <div style={{ position: "relative", display: "grid", gap: ".6rem" }}>
          <p className="label">This certifies that</p>
          <h1 style={{ fontSize: "clamp(1.8rem, 6vw, 4.4rem)", fontWeight: 900, textTransform: "uppercase", color: "var(--yellow)" }}>{r.name}</h1>
          <p style={{ fontSize: "clamp(.9rem, 1.8vw, 1.2rem)", maxWidth: "44rem", color: "var(--muted)" }}>
            took on the Winter Arc, trained through the cold and finished <b style={{ color: "var(--ink)" }}>#{r.rank} of {rows.length}</b> with <b style={{ color: "var(--ink)" }}>{r.total} points</b>
            {r.streak ? <> and a {r.streak}-day training streak</> : null}.
          </p>
        </div>
        <div className="cert-scores">
          {EVENTS.map((e) => (
            <div key={e.id} style={{ borderTop: "2px solid var(--line)", paddingTop: ".4rem", minWidth: 0 }}>
              <div className="label" style={{ fontSize: ".6rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
              <div style={{ fontFamily: "var(--display)", fontWeight: 900, fontSize: "clamp(.9rem, 2.4vw, 1.6rem)" }}>{r.perEvent[e.id] ?? "–"}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", position: "relative" }}>
          <span className="label">{date}</span>
          <span className="label">Winter Arc organizers</span>
        </div>
      </div>
    </div>
  );
}
