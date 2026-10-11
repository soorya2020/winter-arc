/** The excuses we all use, each one stamped REJECTED. Sits on the right of the hero. Pure CSS, so it costs nothing on phones. */
const EXCUSES = ["Mazha aanu machane", "Kaalu vedana, sathyam", "Naale muthal pakka", "Office-il bhayankara work", "Ammede veettil function"];

export default function HeroFun() {
  return (
    <div className="hero-fun">
      <div className="fun fun--rejected" aria-hidden="true">
        <p className="fun-k">Today's excuse</p>
        <div className="fun-stage">
          {EXCUSES.map((e, i) => (
            <span key={e} style={{ ["--n" as string]: i }}>
              <i className="ex"><q>{e}</q><b className="stamp">Rejected</b></i>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
