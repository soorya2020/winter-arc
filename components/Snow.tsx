// A few seconds of light snow over the home page when it first loads, then it melts away.
// Pure CSS, so it costs nothing after it stops; skipped when the device asks for less motion.

const FLAKES = (() => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 46 }, () => ({
    left: rnd() * 100,
    size: 4 + rnd() * 6,
    fall: 3.2 + rnd() * 2.4,
    delay: rnd() * 1.8,
    drift: (rnd() - 0.5) * 80,
    blur: rnd() < 0.3,
  }));
})();

export default function Snow() {
  return (
    <div className="snow" aria-hidden="true">
      {FLAKES.map((f, i) => (
        <i key={i} className={f.blur ? "far" : undefined}
          style={{ left: `${f.left.toFixed(2)}%`, width: `${f.size.toFixed(1)}px`, height: `${f.size.toFixed(1)}px`,
            animationDuration: `${f.fall.toFixed(2)}s`, animationDelay: `${f.delay.toFixed(2)}s`, ["--dx" as string]: `${f.drift.toFixed(0)}px` }} />
      ))}
    </div>
  );
}
