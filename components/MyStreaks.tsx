"use client";

// Today tab: the member's own streaks at a glance. Tapping opens the quick log.
export type MyStreak = { id: string; icon: string; name: string; current: number; rank: number | null; of: number; note: string };

const openLog = () => window.dispatchEvent(new Event("quicklog:open"));

export default function MyStreaks({ items }: { items: MyStreak[] }) {
  return (
    <div className="card-s my-streaks">
      <div className="ms-head"><span className="label">My streaks</span><button type="button" className="qk-link" onClick={openLog}>Log today</button></div>
      {items.length ? (
        <ul>
          {items.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={openLog}>
                <span className="ms-ic" aria-hidden="true">{s.icon}</span>
                <span className="ms-txt"><b>{s.name}</b><small>{s.note}</small></span>
                <span className="ms-n"><b>{s.current}</b><small>{s.current === 1 ? "day" : "days"}</small></span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <button type="button" className="ghost small" onClick={openLog}>Pick the streaks you&apos;ll follow</button>
      )}
    </div>
  );
}
