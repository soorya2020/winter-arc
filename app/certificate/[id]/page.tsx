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
      <style>{`@page { size: A4 landscape; margin: 0 }`}</style>
      <div className="noprint"><PrintButton /></div>
      <div className="cert">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", borderBottom: "2px solid var(--ink)", paddingBottom: ".6rem" }}>
          <span className="label" style={{ color: "var(--ink)" }}>Certificate of completion</span>
          <span className="label">{SEASON.name}</span>
        </div>
        <div style={{ display: "grid", gap: ".8rem" }}>
          <p className="label">This certifies that</p>
          <h1 style={{ fontSize: "clamp(2.6rem, 9vw, 6.5rem)", lineHeight: .85 }}>{r.name}<span style={{ color: "var(--accent)" }}>.</span></h1>
          <p style={{ fontSize: "clamp(1rem, 2vw, 1.35rem)", fontWeight: 600, maxWidth: "40rem" }}>
            took on the Winter Arc, trained through the cold and finished <b style={{ color: "var(--accent)" }}>#{r.rank} of {rows.length}</b> with <b style={{ color: "var(--accent)" }}>{r.total} points</b>
            {r.streak ? <> and a {r.streak}-day training streak</> : null}.
          </p>
        </div>
        <div className="cert-scores">
          {EVENTS.map((e) => (
            <div key={e.id} style={{ borderTop: "2px solid var(--ink)", paddingTop: ".4rem", minWidth: 0 }}>
              <div className="label" style={{ fontSize: ".6rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
              <div style={{ fontFamily: "var(--display)", fontSize: "clamp(1.4rem, 3vw, 2.2rem)", lineHeight: 1 }}>{r.perEvent[e.id] ?? "–"}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <span className="label">{date}</span>
          <span className="label">Winter Arc organizers</span>
        </div>
      </div>
    </div>
  );
}
