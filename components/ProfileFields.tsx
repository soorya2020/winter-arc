import { PERSONAL, QUESTIONS, TONES, TRAINING_SINCE, type Profile } from "@/lib/profile.ts";

/** The profile questions, shared by the invite form and the profile page. */
export default function ProfileFields({ profile, catchphrase, rivals }: { profile?: Profile | null; catchphrase?: string | null; rivals: { id: string; name: string }[] }) {
  const p = profile ?? {};
  return (
    <>
      <p className="label" style={{ color: "var(--accent)", marginTop: ".5rem" }}>About you · answer honestly</p>
      <div className="field">
        <label htmlFor="trainingSince">How long have you been working out?</label>
        <select id="trainingSince" name="trainingSince" defaultValue={p.trainingSince ?? ""} required>
          <option value="" disabled>Choose one</option>
          {TRAINING_SINCE.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      {PERSONAL.map((q) => (
        <div className="field" key={q.key}>
          <label htmlFor={q.key}>{q.label}</label>
          <input id={q.key} name={q.key} maxLength={100} required defaultValue={p[q.key] ?? ""} placeholder={q.placeholder} />
        </div>
      ))}
      <div className="grid2">
        <div className="field">
          <label htmlFor="bestRun">Longest you've ever run (km)</label>
          <input id="bestRun" name="bestRun" type="number" min={0} max={500} step={0.1} required defaultValue={p.bestRun ?? ""} placeholder="5" />
        </div>
        <div className="field">
          <label htmlFor="maxPushups">Most push-ups in one go</label>
          <input id="maxPushups" name="maxPushups" type="number" min={0} max={2000} step={1} required defaultValue={p.maxPushups ?? ""} placeholder="20" />
        </div>
      </div>

      <p className="label" style={{ color: "var(--accent)", marginTop: ".75rem" }}>Your fighter · optional</p>
      <div className="field">
        <label htmlFor="catchphrase">Your catchphrase</label>
        <input id="catchphrase" name="catchphrase" maxLength={80} defaultValue={catchphrase ?? ""} placeholder="Your fighter shouts this in the arena" />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="tone">How do you trash-talk?</label>
          <select id="tone" name="tone" defaultValue={p.tone ?? "Playful"}>{TONES.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        <div className="field">
          <label htmlFor="schedule">When do you train?</label>
          <select id="schedule" name="schedule" defaultValue={p.schedule ?? ""}>
            <option value="">Whenever</option><option>Early bird</option><option>Night owl</option>
          </select>
        </div>
      </div>
      {QUESTIONS.map((q) => (
        <div className="field" key={q.key}>
          <label htmlFor={q.key}>{q.label}</label>
          <input id={q.key} name={q.key} maxLength={60} defaultValue={p[q.key] ?? ""} placeholder={q.placeholder} />
        </div>
      ))}
      <div className="field">
        <label htmlFor="rivalId">Who are you coming for?</label>
        <select id="rivalId" name="rivalId" defaultValue={p.rivalId ?? ""}>
          <option value="">Everyone</option>
          {rivals.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
    </>
  );
}
