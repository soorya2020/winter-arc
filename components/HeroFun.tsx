import Hype from "./Hype";

/** Something funny for the empty right side of the hero. Pure SVG and CSS, so it costs nothing on phones. */
export type FunStyle = "rejected" | "pushups" | "reality" | "flip";

const EXCUSES = ["Mazha aanu machane", "Kaalu vedana, sathyam", "Naale muthal pakka", "Office-il bhayankara work", "Ammede veettil function"];
const GRUNTS = ["Ithu last one aanu…", "Ente kai poyi!", "Adutha varsham six pack", "Oru 5 minute break?"];

const SKIN = "#c68a5a", JERSEY = "#ff4d00", INK = "#0c0d0e";

function Beanie({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 18} ${y} a18 17 0 0 1 36 0 z`} fill="#f4f5f1" stroke={INK} strokeWidth="2" />
      <rect x={x - 19} y={y - 4} width="38" height="7" rx="3" fill={JERSEY} />
      <circle cx={x} cy={y - 19} r="5" fill={JERSEY} />
    </g>
  );
}

function Rejected() {
  return (
    <div className="fun fun--rejected">
      <p className="fun-k">Today's excuse</p>
      <div className="fun-stage">
        {EXCUSES.map((e, i) => (
          <span key={e} style={{ ["--n" as string]: i }}>
            <i className="ex"><q>{e}</q><b className="stamp">Rejected</b></i>
          </span>
        ))}
      </div>
    </div>
  );
}

function Pushups() {
  return (
    <div className="fun fun--pushups">
      <div className="bubble">{GRUNTS.map((g, i) => <span key={g} style={{ ["--n" as string]: i }}>{g}</span>)}</div>
      <svg viewBox="0 64 320 124" role="img" aria-label="A cartoon fighter struggling through push-ups">
        <line x1="10" y1="172" x2="310" y2="172" stroke={INK} strokeWidth="3" />
        <ellipse cx="190" cy="174" rx="110" ry="5" fill="rgba(12,13,14,.12)" />
        {/* arm sits under the body and squashes as he goes down */}
        <g className="pu-arm"><rect x="104" y="120" width="13" height="52" rx="6" fill={SKIN} /></g>
        <g className="pu-body">
          <line x1="270" y1="164" x2="192" y2="142" stroke="#26272a" strokeWidth="15" strokeLinecap="round" />
          <line x1="192" y1="142" x2="112" y2="120" stroke={JERSEY} strokeWidth="24" strokeLinecap="round" />
          <text x="160" y="137" fontSize="13" fontWeight="800" fill="#fff" transform="rotate(16 160 137)" fontFamily="Arial, sans-serif">49</text>
          <rect x="268" y="158" width="24" height="12" rx="5" fill="#f4f5f1" stroke={INK} strokeWidth="1.5" />
          <circle cx="88" cy="110" r="18" fill={SKIN} />
          <Beanie x={88} y={102} />
          <circle cx="79" cy="111" r="2.4" fill={INK} />
          <path d="M74 120 q5 -4 10 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path className="sweat s1" d="M70 100 q-4 7 0 9 q4 -2 0 -9z" fill="#5ab4ff" />
          <path className="sweat s2" d="M100 96 q-4 7 0 9 q4 -2 0 -9z" fill="#5ab4ff" />
        </g>
      </svg>
      <p className="fun-cap">Push-ups: <b>49</b> / 50. Since Monday.</p>
    </div>
  );
}

function Fighter({ belly }: { belly: boolean }) {
  return (
    <g>
      <rect x="62" y="150" width="14" height="38" rx="5" fill="#26272a" />
      <rect x="84" y="150" width="14" height="38" rx="5" fill="#26272a" />
      <rect x="56" y="184" width="24" height="10" rx="5" fill="#f4f5f1" stroke={INK} strokeWidth="1.5" />
      <rect x="82" y="184" width="24" height="10" rx="5" fill="#f4f5f1" stroke={INK} strokeWidth="1.5" />
      {belly
        ? <ellipse cx="80" cy="128" rx="38" ry="34" fill={JERSEY} />
        : <path d="M52 96 h56 l-8 60 h-40z" fill={JERSEY} />}
      <circle cx="80" cy="74" r="20" fill={SKIN} />
      <Beanie x={80} y={66} />
      <circle cx="73" cy="75" r="2.4" fill={INK} /><circle cx="87" cy="75" r="2.4" fill={INK} />
      {belly
        ? <ellipse cx="80" cy="86" rx="5" ry="4" fill={INK} />
        : <path d="M72 84 q8 7 16 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />}
    </g>
  );
}

function Reality() {
  return (
    <div className="fun fun--reality">
      <div className="fun-stage">
        <figure className="card exp">
          <figcaption><span>Expectation</span>Six pack</figcaption>
          <svg viewBox="14 38 132 160" role="img" aria-label="A cartoon fighter flexing">
            <Fighter belly={false} />
            <path d="M54 100 l-22 -6 l-6 -30" stroke={SKIN} strokeWidth="13" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M106 100 l22 -6 l6 -30" stroke={SKIN} strokeWidth="13" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="34" cy="90" r="9" fill={SKIN} /><circle cx="126" cy="90" r="9" fill={SKIN} />
            <g stroke="rgba(255,255,255,.75)" strokeWidth="2"><line x1="74" y1="118" x2="86" y2="118" /><line x1="74" y1="128" x2="86" y2="128" /><line x1="74" y1="138" x2="86" y2="138" /><line x1="80" y1="112" x2="80" y2="144" /></g>
          </svg>
        </figure>
        <figure className="card real">
          <figcaption><span>Reality</span>Six porotta</figcaption>
          <svg viewBox="14 38 132 160" role="img" aria-label="The same fighter with a belly, holding a stack of porottas">
            <Fighter belly />
            <path d="M46 112 q-6 20 22 24" stroke={SKIN} strokeWidth="13" fill="none" strokeLinecap="round" />
            <path d="M114 112 q6 20 -22 24" stroke={SKIN} strokeWidth="13" fill="none" strokeLinecap="round" />
            <ellipse cx="80" cy="140" rx="34" ry="7" fill="#f4f5f1" stroke={INK} strokeWidth="1.5" />
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <g key={k} className="porotta" style={{ ["--k" as string]: k }}>
                <ellipse cx="80" cy={134 - k * 6} rx="26" ry="6" fill="#e2b46c" stroke="#a8712c" strokeWidth="1.5" />
                <path d={`M70 ${134 - k * 6} q10 -4 20 0 q-10 3 -14 0`} stroke="#a8712c" strokeWidth="1.2" fill="none" />
              </g>
            ))}
          </svg>
        </figure>
      </div>
    </div>
  );
}

export default function HeroFun({ style = "rejected" }: { style?: FunStyle }) {
  return (
    <div className="hero-fun" data-fun={style}>
      {style === "rejected" ? <Rejected /> : style === "pushups" ? <Pushups /> : style === "flip" ? <Hype style="flip" /> : <Reality />}
    </div>
  );
}

/** Preview helper: all three side by side so a demo page can switch between them. */
export function HeroFunAll() {
  return (
    <div className="hero-fun" data-fun="rejected">
      <div className="fun-slot" data-s="rejected"><Rejected /></div>
      <div className="fun-slot" data-s="pushups" hidden><Pushups /></div>
      <div className="fun-slot" data-s="reality" hidden><Reality /></div>
      <div className="fun-slot" data-s="flip" hidden><Hype style="flip" /></div>
    </div>
  );
}
