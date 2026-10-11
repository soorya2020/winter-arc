"use client";
import { useEffect, useRef } from "react";
import type { BoardRow } from "@/lib/board";
import { alpha, figure, palette } from "@/lib/theme";

// Everyone who accepted stands in one ring. Tap a fighter and yours walks over and hits them.
// No speech bubbles and no chat: just the hit.

const JERSEYS = palette.jerseys;
const SKINS = figure.skins;
const HITS = ["Smash", "Boom", "Ouch", "Wham", "Pow"];

type Fighter = {
  id: string; name: string; me: boolean; jersey: string; skin: string; row: BoardRow;
  x: number; y: number; homeX: number; homeY: number; s: number; face: number;
  state: "idle" | "walk" | "punch" | "hurt"; t0: number; hp: number; phase: number; busy: boolean;
};
type Fight = { a: Fighter; b: Fighter; step: "walk" | "hit" | "react" | "back"; t0: number };
type Pop = { x: number; y: number; text: string; t0: number; big: boolean };

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export default function Arena({ rows, meId }: { rows: BoardRow[]; meId: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const jerseyFor = (id: string, i: number) => (id === meId ? palette.accent : JERSEYS[i % JERSEYS.length]);
  const world = useRef<{ fighters: Fighter[]; fights: Fight[]; pops: Pop[] }>({ fighters: [], fights: [], pops: [] });

  // Keep fighters in sync with the board (new people join, stats change).
  useEffect(() => {
    const w = world.current;
    const keep = new Map(w.fighters.map((f) => [f.id, f]));
    w.fighters = rows.map((r, i) => {
      const old = keep.get(r.id);
      if (old) { old.row = r; old.name = r.name; return old; }
      return { id: r.id, name: r.name, me: r.id === meId, jersey: jerseyFor(r.id, i), skin: SKINS[i % SKINS.length], row: r,
        x: NaN, y: NaN, homeX: 0, homeY: 0, s: 1, face: 1, state: "idle", t0: 0, hp: 100, phase: Math.random() * 6, busy: false };
    });
    w.fights = w.fights.filter((f) => w.fighters.includes(f.a) && w.fighters.includes(f.b));
  }, [rows, meId]);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const w = world.current;
    let W = 0, H = 0, raf = 0, last = performance.now();
    // next/font renames families, so read the real names from the CSS variables.
    const css = getComputedStyle(document.documentElement);
    const DISPLAY = (css.getPropertyValue("--font-display").trim() || "Anton") + ", Impact, sans-serif";
    const BODY = (css.getPropertyValue("--font-body").trim() || "Archivo") + ", Arial, sans-serif";

    const layout = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(1, w.fighters.length);
      const perRow = Math.min(n, 3);
      const rowsN = Math.ceil(n / perRow);
      // Each row needs about 190 px (fighter, name tag, health bar) at full size; shrink to fit.
      let s0 = Math.max(0.6, Math.min(0.85, W / 480));
      const step = rowsN > 1 ? (H - 44 - 175 * s0) / (rowsN - 1) : 0;
      if (rowsN > 1 && step < 195 * s0) s0 = Math.max(0.45, (H - 44) / (175 + 195 * (rowsN - 1)));
      const pitch = rowsN > 1 ? (H - 44 - 175 * s0) / (rowsN - 1) : 0;
      w.fighters.forEach((f, i) => {
        const rowI = Math.floor(i / perRow), col = i % perRow, cols = Math.min(perRow, n - rowI * perRow);
        f.s = s0;
        f.homeX = (W / (cols + 1)) * (col + 1);
        f.homeY = H - 44 - (rowsN - 1 - rowI) * pitch;
        if (Number.isNaN(f.x)) { f.x = f.homeX; f.y = f.homeY; f.face = f.homeX < W / 2 ? 1 : -1; }
      });
    };
    layout();
    const ro = new ResizeObserver(layout); ro.observe(cv);

    const start = (a: Fighter, b: Fighter, now: number) => {
      if (a.busy || b.busy || a === b) return;
      a.busy = b.busy = true; a.state = "walk"; a.face = b.x > a.x ? 1 : -1;
      w.fights.push({ a, b, step: "walk", t0: now });
    };

    const update = (now: number, dt: number) => {
      if (w.fighters.some((f) => Number.isNaN(f.x))) layout();
      for (const f of w.fights) {
        const { a, b } = f;
        if (f.step === "walk") {
          const tx = b.x - a.face * 58 * a.s, dx = tx - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), sp = 0.5 * dt;
          if (d < sp + 2) { a.x = tx; a.y = b.y; f.step = "hit"; f.t0 = now; a.state = "punch"; a.t0 = now; }
          else { a.x += (dx / d) * sp; a.y += (dy / d) * sp; }
        } else if (f.step === "hit" && now - f.t0 > 170) {
          f.step = "react"; f.t0 = now; b.state = "hurt"; b.t0 = now; b.face = -a.face;
          const dmg = 6 + Math.floor(Math.random() * 12);
          b.hp = Math.max(10, b.hp - dmg);
          w.pops.push({ x: b.x, y: b.y - 125 * b.s, text: pick(HITS), t0: now, big: true }, { x: b.x + 32 * b.s, y: b.y - 85 * b.s, text: `-${dmg}`, t0: now, big: false });
          navigator.vibrate?.(30);
        } else if (f.step === "react" && now - f.t0 > 500) {
          f.step = "back"; f.t0 = now; a.state = "walk";
        } else if (f.step === "back") {
          const hx = a.homeX - a.x, hy = a.homeY - a.y, hd = Math.hypot(hx, hy), sp = 0.45 * dt;
          a.face = hx > 0 ? 1 : -1;
          if (b.state === "hurt" && now - b.t0 > 800) b.state = "idle";
          if (hd < sp + 2) { a.x = a.homeX; a.y = a.homeY; a.state = "idle"; b.state = "idle"; a.face = a.homeX < W / 2 ? 1 : -1; a.busy = b.busy = false; f.t0 = -1; }
          else { a.x += (hx / hd) * sp; a.y += (hy / hd) * sp; }
        }
      }
      w.fights = w.fights.filter((f) => f.t0 !== -1);
      for (const f of w.fighters) if (!f.busy && f.hp < 100) f.hp = Math.min(100, f.hp + dt * 0.004);
    };

const limb = (x1: number, y1: number, x2: number, y2: number, wd: number, c: string) => { ctx.strokeStyle = c; ctx.lineWidth = wd; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const rr = (x: number, y: number, w2: number, h: number, r: number) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w2, h, r); else ctx.rect(x, y, w2, h); };

    const drawFighter = (f: Fighter, now: number) => {
      const t = now / 1000 + f.phase, s = f.s, d = f.face;
      const bob = f.state === "idle" ? Math.sin(t * 4) * 3 : f.state === "walk" ? -Math.abs(Math.sin(t * 12)) * 5 : 0;
      const lean = f.state === "hurt" ? -0.25 * d : f.state === "punch" ? 0.12 * d : 0;
      const shake = f.state === "hurt" && now - f.t0 < 300 ? (Math.random() - 0.5) * 6 : 0;
      ctx.save();
      ctx.translate(f.x + shake, f.y);
      ctx.fillStyle = alpha(palette.ink, 0.12); ctx.beginPath(); ctx.ellipse(0, 0, 34 * s, 7 * s, 0, 0, 7); ctx.fill();
      ctx.scale(s, s); ctx.translate(0, bob); ctx.rotate(lean);
      const pants = figure.pants, hip = -46, sh = -92, step = f.state === "walk" ? Math.sin(t * 12) * 14 : 0;
      limb(-7, hip, -10 - step, -4, 12, pants); limb(7, hip, 10 + step, -4, 12, pants);
      ctx.fillStyle = figure.shoe; ctx.strokeStyle = figure.line; ctx.lineWidth = 1.4;
      rr(-19 - step, -8, 18, 9, 4); ctx.fill(); ctx.stroke(); rr(1 + step, -8, 18, 9, 4); ctx.fill(); ctx.stroke();
      // torso
      ctx.fillStyle = f.jersey; rr(-21, sh - 4, 42, hip - sh + 12, 13); ctx.fill();
      ctx.fillStyle = f.me ? palette.ink : palette.accent; ctx.fillRect(-21, sh + 22, 42, 5);
      ctx.fillStyle = figure.number;
      ctx.font = `16px ${DISPLAY}`; ctx.textAlign = "center"; ctx.fillText(String(f.row.rank), 0, hip - 8);
      // arms
      const pr = f.state === "punch" ? Math.min(1, (now - f.t0) / 110) : 0, g = Math.sin(t * 4) * 3;
      let back: [number, number] = [d * 14, sh + 20 + g], front: [number, number] = [d * (24 + 40 * pr), sh + 12 - 4 * pr + g];
      if (f.state === "hurt") { back = [-d * 10, sh - 18]; front = [-d * 22, sh - 12]; }
      limb(-d * 14, sh + 6, back[0], back[1], 10, f.jersey); limb(d * 14, sh + 6, front[0], front[1], 10, f.jersey);
      ctx.fillStyle = f.skin; for (const h of [back, front]) { ctx.beginPath(); ctx.arc(h[0], h[1], 8, 0, 7); ctx.fill(); }
      // head + beanie
      const hy = sh - 24;
      ctx.fillStyle = f.skin; ctx.beginPath(); ctx.arc(0, hy, 21, 0, 7); ctx.fill();
      ctx.fillStyle = figure.line;
      if (f.state === "hurt") { ctx.font = `800 13px ${BODY}`; ctx.fillText("x  x", d * 4, hy + 6); }
      else {
        ctx.beginPath(); ctx.arc(d * 5 - 5, hy + 2, 2.6, 0, 7); ctx.arc(d * 5 + 6, hy + 2, 2.6, 0, 7); ctx.fill();
        limb(d * 5 - 10, hy - 5, d * 5 - 2, hy - 2, 2.4, figure.line); limb(d * 5 + 11, hy - 5, d * 5 + 3, hy - 2, 2.4, figure.line);
        ctx.strokeStyle = figure.line; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(d * 5 - 5, hy + 9); ctx.quadraticCurveTo(d * 5 + 2, hy + 15, d * 5 + 8, hy + 8); ctx.stroke();
      }
      ctx.fillStyle = f.me ? palette.accent : figure.shoe; ctx.strokeStyle = figure.line; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-21, hy - 5); ctx.quadraticCurveTo(0, hy - 38, 21, hy - 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = f.me ? palette.ink : palette.accent; rr(-22, hy - 10, 44, 8, 4); ctx.fill();
      ctx.beginPath(); ctx.arc(0, hy - 30, 6, 0, 7); ctx.fill();
      ctx.restore();
      // name tag + hp
      const ny = f.y + 22, fs = Math.round(12 * Math.max(0.9, s));
      ctx.font = `800 ${fs}px ${BODY}`; ctx.textAlign = "center";
      const label = f.me ? "You" : f.name.split(" ")[0], tw = ctx.measureText(label).width + 14;
      ctx.fillStyle = f.me ? palette.accent : palette.surface; rr(f.x - tw / 2, ny - fs, tw, fs + 6, 99); ctx.fill();
      if (!f.me) { ctx.strokeStyle = palette.line; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.fillStyle = f.me ? palette.onAccent : palette.ink; ctx.fillText(label, f.x, ny);
      const bw = 50 * s; ctx.fillStyle = palette.track; ctx.fillRect(f.x - bw / 2, ny + 7, bw, 4);
      ctx.fillStyle = f.hp > 40 ? palette.ink : palette.accent; ctx.fillRect(f.x - bw / 2, ny + 7, (bw * f.hp) / 100, 4);
    };

    const drawStage = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.font = `${Math.round(Math.min(W * 0.2, 120))}px ${DISPLAY}`; ctx.textAlign = "center";
      ctx.fillStyle = alpha(palette.ink, 0.045); ctx.fillText("WINTER ARC", W / 2, H * 0.22); ctx.restore();
    };

    const frame = (now: number) => {
      const dt = Math.min(50, now - last); last = now;
      update(now, dt);
      drawStage();
      if (!w.fighters.length) {
        ctx.fillStyle = palette.muted; ctx.font = `600 15px ${BODY}`; ctx.textAlign = "center";
        ctx.fillText("The ring fills up as people accept.", W / 2, H / 2 + 40);
      }
      [...w.fighters].sort((a, b) => a.y - b.y).forEach((f) => drawFighter(f, now));
      w.pops = w.pops.filter((p) => {
        const age = now - p.t0; if (age > 800) return false;
        ctx.save(); ctx.globalAlpha = 1 - age / 800; ctx.textAlign = "center";
        ctx.font = `${p.big ? 34 : 20}px ${DISPLAY}`; ctx.fillStyle = p.big ? palette.accent : palette.ink;
        ctx.fillText(p.big ? p.text.toUpperCase() : p.text, p.x, Math.max(p.big ? 40 : 24, p.y - age * 0.05)); ctx.restore(); return true;
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onClick = (e: MouseEvent) => {
      const me = w.fighters.find((f) => f.me); if (!me) return;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const hit = w.fighters.find((f) => f !== me && Math.abs(f.x - x) < 44 * f.s && y < f.y + 30 && y > f.y - 165 * f.s);
      if (hit) start(me, hit, performance.now());
    };
    cv.addEventListener("click", onClick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener("click", onClick); };
  }, []);

  const me = rows.some((r) => r.id === meId);
  return (
    <div className="ring">
      <canvas ref={ref} aria-label="The ring: tap a fighter to hit them" />
      <p className="hint">{me ? "Tap anyone to hit them." : "Members can tap a fighter to hit them."} {rows.length} in the ring.</p>
    </div>
  );
}
