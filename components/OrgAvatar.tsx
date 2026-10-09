/** The organizers as arena-style fighters: one curling dumbbells, one running. Pure SVG and CSS. */
const SKIN = "#c68a5a", INK = "#0c0d0e", PANTS = "#26272a", SHOE = "#f4f5f1";

function Beanie({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 16} ${y} a16 15 0 0 1 32 0 z`} fill={SHOE} stroke={INK} strokeWidth="1.8" />
      <rect x={x - 17} y={y - 4} width="34" height="6.5" rx="3" fill="#ff4d00" />
      <circle cx={x} cy={y - 17} r="4.5" fill="#ff4d00" />
    </g>
  );
}

function Dumbbell() {
  return (
    <g>
      <rect x="-9" y="-1.6" width="18" height="3.2" rx="1.2" fill="#4a4d52" />
      <rect x="-11" y="-6" width="4.5" height="12" rx="1.2" fill={INK} />
      <rect x="6.5" y="-6" width="4.5" height="12" rx="1.2" fill={INK} />
    </g>
  );
}

function Lifter({ jersey, num }: { jersey: string; num: string }) {
  return (
    <svg viewBox="0 0 120 160" className="ava ava--lift" role="img" aria-label="Fighter curling dumbbells">
      <ellipse cx="60" cy="153" rx="34" ry="4" fill="rgba(12,13,14,.15)" />
      <rect x="46" y="108" width="12" height="40" rx="4" fill={PANTS} />
      <rect x="62" y="108" width="12" height="40" rx="4" fill={PANTS} />
      <rect x="41" y="144" width="19" height="8" rx="4" fill={SHOE} stroke={INK} strokeWidth="1.3" />
      <rect x="60" y="144" width="19" height="8" rx="4" fill={SHOE} stroke={INK} strokeWidth="1.3" />
      <path d="M38 64 h44 l-4 48 h-36z" fill={jersey} />
      <text x="60" y="96" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">{num}</text>
      {/* upper arms */}
      <line x1="40" y1="68" x2="34" y2="94" stroke={SKIN} strokeWidth="10" strokeLinecap="round" />
      <line x1="80" y1="68" x2="86" y2="94" stroke={SKIN} strokeWidth="10" strokeLinecap="round" />
      {/* forearms curl up around the elbow */}
      <g className="curl curl-l"><line x1="34" y1="94" x2="34" y2="118" stroke={SKIN} strokeWidth="9" strokeLinecap="round" /><g transform="translate(34 120)"><Dumbbell /></g></g>
      <g className="curl curl-r"><line x1="86" y1="94" x2="86" y2="118" stroke={SKIN} strokeWidth="9" strokeLinecap="round" /><g transform="translate(86 120)"><Dumbbell /></g></g>
      <g className="ava-head">
        <circle cx="60" cy="44" r="16" fill={SKIN} />
        <Beanie x={60} y={38} />
        <circle cx="54" cy="45" r="2.1" fill={INK} /><circle cx="66" cy="45" r="2.1" fill={INK} />
        <path d="M54 53 h12" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        <path className="ava-sweat" d="M77 38 q-3 6 0 8 q3 -2 0 -8z" fill="#5ab4ff" />
      </g>
    </svg>
  );
}

function Runner({ jersey, num }: { jersey: string; num: string }) {
  return (
    <svg viewBox="0 0 120 160" className="ava ava--run" role="img" aria-label="Fighter running">
      <g className="speed" stroke="rgba(12,13,14,.25)" strokeWidth="2.5" strokeLinecap="round">
        <line x1="6" y1="70" x2="22" y2="70" /><line x1="2" y1="90" x2="20" y2="90" /><line x1="10" y1="110" x2="24" y2="110" />
      </g>
      <ellipse cx="62" cy="153" rx="26" ry="4" fill="rgba(12,13,14,.15)" />
      <g transform="rotate(8 62 150)"><g className="bob">
        {/* back leg and arm */}
        <g className="leg leg-b"><rect x="56" y="100" width="11" height="46" rx="4" fill={PANTS} /><rect x="55" y="140" width="20" height="8" rx="4" fill={SHOE} stroke={INK} strokeWidth="1.3" /></g>
        <g className="arm arm-b"><rect x="57" y="68" width="9" height="34" rx="4.5" fill={SKIN} /></g>
        <path d="M48 64 h28 l-2 44 h-26z" fill={jersey} transform="rotate(8 62 86)" />
        <text x="63" y="94" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif" transform="rotate(8 62 86)">{num}</text>
        <g className="leg leg-f"><rect x="56" y="100" width="11" height="46" rx="4" fill={PANTS} /><rect x="55" y="140" width="20" height="8" rx="4" fill={SHOE} stroke={INK} strokeWidth="1.3" /></g>
        <g className="arm arm-f"><rect x="57" y="68" width="9" height="34" rx="4.5" fill={SKIN} /></g>
        <circle cx="68" cy="44" r="16" fill={SKIN} />
        <Beanie x={68} y={38} />
        <circle cx="77" cy="45" r="2.1" fill={INK} />
        <path d="M74 53 q4 3 8 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      </g></g>
    </svg>
  );
}

export default function OrgAvatar({ kind, jersey, num }: { kind: "lift" | "run"; jersey: string; num: string }) {
  return kind === "lift" ? <Lifter jersey={jersey} num={num} /> : <Runner jersey={jersey} num={num} />;
}
