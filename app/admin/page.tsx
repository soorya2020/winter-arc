import Link from "next/link";
import Header from "@/components/Header";
import { isAdmin } from "@/lib/auth";
import { allParticipants, allResults, displayName } from "@/lib/db";
import { inviteLink } from "@/lib/reminders";
import { EVENTS } from "@/lib/season.ts";
import { formatValue, points } from "@/lib/scoring.ts";
import { loadBoard } from "@/lib/board";
import { AddForm, InviteControls, LoginForm, ReminderButton, RemoveButton, ResultCell } from "./ui";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "people", label: "Participants" },
  { id: "running", label: "Running weekend" },
  { id: "strength", label: "Strength weekend" },
  { id: "baseline", label: "Baseline test" },
  { id: "awards", label: "Certificates & posters" },
];

export default async function Admin({ searchParams }: { searchParams: { tab?: string } }) {
  if (!isAdmin()) {
    return (
      <div className="wrap">
        <Header />
        <section style={{ maxWidth: "26rem" }}>
          <div className="head"><span className="label">Organizers only</span><h2>Admin</h2></div>
          <LoginForm />
        </section>
      </div>
    );
  }
  const tab = TABS.some((t) => t.id === searchParams.tab) ? searchParams.tab! : "people";
  const [people, results] = await Promise.all([allParticipants(), allResults()]);

  return (
    <div className="wrap">
      <Header right={<><Link href="/board">Leaderboard</Link><form action={logout}><button className="ghost small" type="submit">Sign out</button></form></>} />
      <section style={{ paddingTop: "1rem" }}>
        <div className="head"><span className="label">Organizer panel</span><h2>Run the arc</h2></div>
        <nav className="tabs">{TABS.map((t) => <Link key={t.id} href={`/admin?tab=${t.id}`} className={t.id === tab ? "on" : ""}>{t.label}</Link>)}</nav>

        {tab === "people" && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div className="grid2">
              <AddForm />
              <div className="panel">
                <h3 style={{ fontSize: "1rem", textTransform: "uppercase" }}>Daily reminder</h3>
                <p className="note">Goes out automatically every morning at 6:00 IST to everyone who accepted. Use this to send today's one right now.</p>
                <ReminderButton />
              </div>
            </div>
            <div className="tablewrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Invite</th><th /></tr></thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.name}</b>{p.nickname && p.nickname !== p.name ? <div className="note">“{p.nickname}”</div> : null}</td>
                      <td className="copy">{p.email}</td>
                      <td><span className={`tag${p.accepted_at ? " on" : ""}`}>{p.accepted_at ? "Accepted" : p.invited_at ? "Invited" : "Not invited"}</span></td>
                      <td><InviteControls id={p.id} link={inviteLink(p)} sent={!!p.invited_at} /></td>
                      <td><RemoveButton id={p.id} name={p.name} /></td>
                    </tr>
                  ))}
                  {!people.length && <tr><td colSpan={5} className="note">No one yet. Add your first invitee above.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(tab === "running" || tab === "strength" || tab === "baseline") && (() => {
          const baseline = tab === "baseline";
          const evs = baseline ? EVENTS : EVENTS.filter((e) => e.weekend === tab);
          const list = people.filter((p) => p.accepted_at);
          return (
            <div style={{ display: "grid", gap: "1rem" }}>
              <p className="note">
                Type the raw result and press Enter or click away. It saves and the leaderboard updates within 10 seconds.
                Times take mm:ss (15:30) or seconds (14.2). Clear a box to remove a result. {baseline && "Baseline results don't count toward the total; they power Biggest Leap."}
              </p>
              <div className="tablewrap">
                <table>
                  <thead><tr><th>Athlete</th>{evs.map((e) => <th key={e.id}>{e.name}<div style={{ textTransform: "none", letterSpacing: 0 }}>{e.unit}</div></th>)}</tr></thead>
                  <tbody>
                    {list.map((p) => (
                      <tr key={p.id}>
                        <td><b>{displayName(p)}</b></td>
                        {evs.map((e) => {
                          const r = results.find((x) => x.participant_id === p.id && x.event_id === e.id && x.baseline === baseline);
                          return (
                            <td key={e.id}>
                              <ResultCell participantId={p.id} eventId={e.id} baseline={baseline}
                                initial={formatValue(e, r?.value)} initialPoints={r ? points(e.scoring, r.value) : null}
                                placeholder={e.unit.startsWith("time (mm") ? "15:30" : e.unit.startsWith("time") ? "14.2" : e.unit} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {!list.length && <tr><td colSpan={evs.length + 1} className="note">Nobody has accepted their invite yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {tab === "awards" && <Awards />}
      </section>
    </div>
  );
}

async function Awards() {
  const rows = await loadBoard();
  const top = (k: "total" | "running" | "strength" | "leap") => [...rows].sort((a, b) => b[k] - a[k])[0];
  const picks = [["Arc Champion", top("total")], ["Iron Lungs", top("running")], ["Steel Core", top("strength")], ["Biggest Leap", top("leap")]] as const;
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div className="awards">
        {picks.map(([title, r]) => (
          <div key={title} className="award">
            <h3>{title}</h3><p>{r ? r.name : "Not decided yet"}</p>
          </div>
        ))}
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>#</th><th>Athlete</th><th>Total</th><th>Certificate</th><th>Poster</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.rank}</td><td><b>{r.name}</b></td><td>{r.total}</td>
                <td><Link href={`/certificate/${r.id}`}>Open</Link></td>
                <td><a href={`/api/poster/${r.id}`}>Download PNG</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">Group poster for the chat: <a href="/api/poster/board">leaderboard poster</a>. Certificates open as a page you can print or save as PDF.</p>
    </div>
  );
}
