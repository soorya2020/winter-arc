import TabBar from "@/components/TabBar";

// Shown instantly while the arena loads: the same layout, in grey.
export default function Loading() {
  return (
    <div className="app" aria-busy="true" aria-label="Loading the arena">
      <header className="appbar">
        <span className="mark">Winter Arc</span>
        <span className="sk sk-pill" />
      </header>
      <div className="tab">
        <div className="stats3">{[0, 1, 2].map((i) => <div key={i} className="sk sk-stat" />)}</div>
        <div className="card-s"><span className="sk sk-line w30" /><span className="sk sk-title" /><span className="sk sk-line w80" /></div>
        <div className="card-s"><span className="sk sk-line w30" /><span className="sk sk-block" /></div>
        <p className="sk-note"><span className="spinner" /> Entering the arena…</p>
      </div>
      <TabBar active="today" />
    </div>
  );
}
