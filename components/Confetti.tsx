"use client";
import { useEffect, useRef } from "react";
import { palette } from "@/lib/theme";

const COLORS = [palette.accent, palette.ink, palette.accent, palette.line, palette.ink];

/** Fire with: window.dispatchEvent(new Event("confetti")) */
export default function Confetti({ onLoad = false }: { onLoad?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const burst = () => {
      if (reduce) return;
      const W = (cv.width = innerWidth), H = (cv.height = innerHeight);
      const P = Array.from({ length: 160 }, (_, i) => ({ x: W / 2, y: H * 0.35, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 14 - 4, r: Math.random() * 6 + 3, c: COLORS[i % 5], a: Math.random() * 6, s: (Math.random() - 0.5) * 0.3 }));
      const start = performance.now();
      const frame = (now: number) => {
        ctx.clearRect(0, 0, W, H);
        for (const p of P) {
          p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.s;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
        }
        if (now - start < 3200) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
      };
      requestAnimationFrame(frame);
    };
    window.addEventListener("confetti", burst);
    const t = onLoad ? setTimeout(burst, 350) : undefined;
    return () => { window.removeEventListener("confetti", burst); clearTimeout(t); };
  }, [onLoad]);
  return <canvas id="fx" ref={ref} aria-hidden="true" />;
}
