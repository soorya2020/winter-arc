"use client";
import { useEffect, useRef, useState } from "react";
import type { BoardRow } from "@/lib/board";
import type { Taunt } from "@/lib/db";
import { postTaunt } from "../actions";
import { trashTalk, comeback as comebackLine, pickTarget, type Talker } from "@/lib/trash.ts";

// Everyone who accepted brawls in one ring. Fighters trash-talk with their real stats,
// and taunts people type here are shared with the whole group.

const JERSEYS = ["#ff4d00", "#ffffff", "#c7ff3d", "#3d7bff", "#ffd23d", "#9d9f97", "#ff8fb1", "#5ee0c7"];
const SKINS = ["#e5b48f", "#c98b62", "#a8714a", "#8d5a3b", "#d6a27c", "#f0c9a5"];
const HITS = ["Smash", "Boom", "Ouch", "Too easy", "Wham"];

type Fighter = {
  id: string; name: string; me: boolean; jersey: string; skin: string; row: BoardRow;
  x: number; y: number; homeX: number; homeY: number; s: number; face: number;
  state: "idle" | "walk" | "punch" | "hurt"; t0: number; hp: number; phase: number; busy: boolean;
};
type Fight = { a: Fighter; b: Fighter; step: "walk" | "hit" | "react" | "back"; t0: number };
type Bubble = { f: Fighter; text: string; t0: number };
type Pop = { x: number; y: number; text: string; t0: number; big: boolean };
type FeedItem = { key: string; who: string; text: string; mine: boolean };

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

const talker = (r: BoardRow): Talker => ({ ...r, profile: r.profile ?? {} });
// Avoid repeating anything said in the last few lines.
const recentLines: string[] = [];
const fresh = (make: () => string) => {
  let line = make();
  for (let i = 0; i < 8 && recentLines.includes(line); i++) line = make();
  recentLines.push(line); if (recentLines.length > 6) recentLines.shift();
  return line;
};
const lineFor = (a: BoardRow, b: BoardRow) => fresh(() => trashTalk(talker(a), talker(b)));
const comeback = (b: BoardRow, a: BoardRow) => fresh(() => comebackLine(talker(b), talker(a)));

export default function Arena({ rows, taunts, meId }: { rows: BoardRow[]; taunts: Taunt[]; meId: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const world = useRef<{ fighters: Fighter[]; fights: Fight[]; bubbles: Bubble[]; pops: Pop[]; seen: Set<number>; mine: { text: string; at: number }[]; paused: boolean }>(
    { fighters: [], fights: [], bubbles: [], pops: [], seen: new Set(taunts.map((t) => t.id)), mine: [], paused: false },
  );
  const [feed, setFeed] = useState<FeedItem[]>(() =>
    taunts.slice(0, 8).map((t) => ({ key: `t${t.id}`, who: rows.find((r) => r.id === t.participant_id)?.name ?? "Someone", text: t.text, mine: t.participant_id === meId })),
  );
  const [text, setText] = useState("");
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const addFeed = (who: string, t: string, mine: boolean) =>
    setFeed((f) => [{ key: `${Date.now()}${Math.random()}`, who, text: t, mine }, ...f].slice(0, 30));
  const addFeedRef = useRef(addFeed); addFeedRef.current = addFeed;

  // Keep fighters in sync with the board (new people join, stats change).
  useEffect(() => {
    const w = world.current;
    const keep = new Map(w.fighters.map((f) => [f.id, f]));
    w.fighters = rows.map((r, i) => {
      const old = keep.get(r.id);
      if (old) { old.row = r; old.name = r.name; return old; }
      return { id: r.id, name: r.name, me: r.id === meId, jersey: r.id === meId ? "#ff4d00" : JERSEYS[(i + 1) % JERSEYS.length], skin: SKINS[i % SKINS.length], row: r,
        x: NaN, y: NaN, homeX: 0, homeY: 0, s: 1, face: 1, state: "idle", t0: 0, hp: 100, phase: Math.random() * 6, busy: false };
    });
    w.fights = w.fights.filter((f) => w.fighters.includes(f.a) && w.fighters.includes(f.b));
  }, [rows, meId]);

  // Play taunts other people typed.
  useEffect(() => {
    const w = world.current;
    const fresh = taunts.filter((t) => !w.seen.has(t.id)).reverse();
    for (const t of fresh) {
      w.seen.add(t.id);
      if (t.participant_id === meId && w.mine.some((m) => m.text === t.text && Date.now() - m.at < 30000)) continue;
      const a = w.fighters.find((f) => f.id === t.participant_id);
      if (!a) continue;
      const b = w.fighters.find((f) => f.id === t.target_id) ?? pick(w.fighters.filter((f) => f !== a));
      queue(a, b, t.text);
      addFeedRef.current(a.name, t.text, a.me);
    }
  }, [taunts, meId]);

  const pending = useRef<{ a: Fighter; b: Fighter | undefined; text: string }[]>([]);
  function queue(a: Fighter, b: Fighter | undefined, text: string) { pending.current.push({ a, b, text }); }

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const w = world.current;
    let W = 0, H = 0, raf = 0, last = performance.now(), lastAuto = 0;
    // next/font renames families, so read the real names from the CSS variables.
    const css = getComputedStyle(document.documentElement);
    const DISPLAY = (css.getPropertyValue("--font-display").trim() || "Anton") + ", Impact, sans-serif";
    const BODY = (css.getPropertyValue("--font-body").trim() || "Archivo") + ", Arial, sans-serif";

    const layout = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(1, w.fighters.length);
      const perRow = W < 520 ? Math.min(n, 3) : Math.min(n, 8);
      w.fighters.forEach((f, i) => {
        const rowI = Math.floor(i / perRow), col = i % perRow, cols = Math.min(perRow, n - rowI * perRow);
        f.homeX = W * (cols === 1 ? 0.5 : 0.15 + 0.7 * (col / (cols - 1)));
        f.homeY = H * (0.88 - rowI * 0.24) - (col % 2) * H * 0.04;
        f.s = Math.max(0.6, Math.min(1.2, W / 850)) * (rowI ? 0.85 : 1);
        if (Number.isNaN(f.x)) { f.x = f.homeX; f.y = f.homeY; f.face = f.homeX < W / 2 ? 1 : -1; }
      });
    };
    layout();
    const ro = new ResizeObserver(layout); ro.observe(cv);

    const say = (f: Fighter, text: string, now: number) => { w.bubbles = w.bubbles.filter((b) => b.f !== f); w.bubbles.push({ f, text, t0: now }); };
    const start = (a: Fighter, b: Fighter, text: string, now: number, toFeed: boolean) => {
      if (a.busy || b.busy || a === b) return false;
      a.busy = b.busy = true; a.state = "walk"; a.face = b.x > a.x ? 1 : -1;
      w.fights.push({ a, b, step: "walk", t0: now });
      say(a, text, now);
      if (toFeed) addFeedRef.current(a.name, text, a.me);
      return true;
    };

    const update = (now: number, dt: number) => {
      if (w.fighters.length !== 0 && w.fighters.some((f) => Number.isNaN(f.x))) layout();
      // queued taunts first
      pending.current = pending.current.filter((p) => {
        const b = p.b && w.fighters.includes(p.b) ? p.b : pick(w.fighters.filter((f) => f !== p.a));
        return !(b && start(p.a, b, p.text, now, false));
      });
      for (const f of w.fights) {
        const { a, b } = f;
        if (f.step === "walk") {
          const tx = b.x - a.face * 58 * a.s, dx = tx - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), sp = 0.34 * dt;
          if (d < sp + 2) { a.x = tx; a.y = b.y; f.step = "hit"; f.t0 = now; a.state = "punch"; a.t0 = now; }
          else { a.x += (dx / d) * sp; a.y += (dy / d) * sp; }
        } else if (f.step === "hit" && now - f.t0 > 170) {
          f.step = "react"; f.t0 = now; b.state = "hurt"; b.t0 = now; b.face = -a.face;
          const dmg = 6 + Math.floor(Math.random() * 12);
          b.hp = Math.max(10, b.hp - dmg);
          w.pops.push({ x: b.x, y: b.y - 125 * b.s, text: pick(HITS), t0: now, big: true }, { x: b.x + 32 * b.s, y: b.y - 85 * b.s, text: `-${dmg}`, t0: now, big: false });
        } else if (f.step === "react" && now - f.t0 > 650) {
          f.step = "back"; f.t0 = now; a.state = "walk";
          say(b, comeback(b.row, a.row), now);
        } else if (f.step === "back") {
          const hx = a.homeX - a.x, hy = a.homeY - a.y, hd = Math.hypot(hx, hy), sp = 0.3 * dt;
          a.face = hx > 0 ? 1 : -1;
          if (b.state === "hurt" && now - b.t0 > 900) b.state = "idle";
          if (hd < sp + 2) { a.x = a.homeX; a.y = a.homeY; a.state = "idle"; b.state = "idle"; a.face = a.homeX < W / 2 ? 1 : -1; a.busy = b.busy = false; f.step = "walk"; f.t0 = -1; }
          else { a.x += (hx / hd) * sp; a.y += (hy / hd) * sp; }
        }
      }
      w.fights = w.fights.filter((f) => f.t0 !== -1);
      for (const f of w.fighters) if (!f.busy && f.hp < 100) f.hp = Math.min(100, f.hp + dt * 0.004);
      // free-for-all: keep up to two scraps going at once
      const free = w.fighters.filter((f) => !f.busy);
      if (!reduce && free.length >= 2 && w.fights.length < (W < 520 ? 1 : Math.min(2, Math.floor(w.fighters.length / 2))) && now - lastAuto > 1300) {
        lastAuto = now;
        const a = pick(free), b = pickTarget(talker(a.row), free.filter((f) => f !== a));
        if (b) start(a, b, lineFor(a.row, b.row), now, true);
      }
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
      ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.ellipse(0, 0, 34 * s, 7 * s, 0, 0, 7); ctx.fill();
      ctx.scale(s, s); ctx.translate(0, bob); ctx.rotate(lean);
      const pants = "#26272a", hip = -46, sh = -92, step = f.state === "walk" ? Math.sin(t * 12) * 14 : 0;
      limb(-7, hip, -10 - step, -4, 12, pants); limb(7, hip, 10 + step, -4, 12, pants);
      ctx.fillStyle = "#f4f5f1"; rr(-19 - step, -8, 18, 9, 4); ctx.fill(); rr(1 + step, -8, 18, 9, 4); ctx.fill();
      // torso
      ctx.fillStyle = f.jersey; rr(-21, sh - 4, 42, hip - sh + 12, 13); ctx.fill();
      ctx.fillStyle = f.me ? "#0c0d0e" : "#ff4d00"; ctx.fillRect(-21, sh + 22, 42, 5);
      ctx.fillStyle = f.jersey === "#ffffff" || f.jersey === "#c7ff3d" || f.jersey === "#ffd23d" ? "#0c0d0e" : "#ffffff";
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
      ctx.fillStyle = "#0c0d0e";
      if (f.state === "hurt") { ctx.font = `800 13px ${BODY}`; ctx.fillText("x  x", d * 4, hy + 6); }
      else {
        ctx.beginPath(); ctx.arc(d * 5 - 5, hy + 2, 2.6, 0, 7); ctx.arc(d * 5 + 6, hy + 2, 2.6, 0, 7); ctx.fill();
        limb(d * 5 - 10, hy - 5, d * 5 - 2, hy - 2, 2.4, "#0c0d0e"); limb(d * 5 + 11, hy - 5, d * 5 + 3, hy - 2, 2.4, "#0c0d0e");
        ctx.strokeStyle = "#0c0d0e"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(d * 5 - 5, hy + 9); ctx.quadraticCurveTo(d * 5 + 2, hy + 15, d * 5 + 8, hy + 8); ctx.stroke();
      }
      ctx.fillStyle = f.me ? "#ff4d00" : "#f4f5f1"; ctx.beginPath(); ctx.moveTo(-21, hy - 5); ctx.quadraticCurveTo(0, hy - 38, 21, hy - 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = f.me ? "#0c0d0e" : "#ff4d00"; rr(-22, hy - 10, 44, 8, 4); ctx.fill();
      ctx.beginPath(); ctx.arc(0, hy - 30, 6, 0, 7); ctx.fill();
      ctx.restore();
      // name tag + hp
      const ny = f.y + 22, fs = Math.round(12 * Math.max(0.9, s));
      ctx.font = `800 ${fs}px ${BODY}`; ctx.textAlign = "center";
      const label = f.me ? `${f.name} (you)` : f.name, tw = ctx.measureText(label).width + 14;
      ctx.fillStyle = f.me ? "#ff4d00" : "#ffffff"; rr(f.x - tw / 2, ny - fs, tw, fs + 6, 99); ctx.fill();
      ctx.fillStyle = f.me ? "#ffffff" : "#0c0d0e"; ctx.fillText(label, f.x, ny);
      const bw = 50 * s; ctx.fillStyle = "#2a2c27"; ctx.fillRect(f.x - bw / 2, ny + 7, bw, 4);
      ctx.fillStyle = f.hp > 40 ? "#ffffff" : "#ff4d00"; ctx.fillRect(f.x - bw / 2, ny + 7, (bw * f.hp) / 100, 4);
    };

    const wrap = (txt: string, maxW: number) => {
      const out: string[] = []; let cur = "";
      for (const word of txt.split(" ")) { const t2 = cur ? cur + " " + word : word; if (ctx.measureText(t2).width > maxW && cur) { out.push(cur); cur = word; } else cur = t2; }
      if (cur) out.push(cur); return out.slice(0, 4);
    };
    const drawBubble = (b: Bubble, now: number) => {
      const age = now - b.t0, dur = 2400 + b.text.length * 25;
      if (age > dur) return false;
      const f = b.f;
      ctx.save(); ctx.globalAlpha = Math.min(1, age / 120, (dur - age) / 250);
      ctx.font = `700 13px ${BODY}`;
      const lines = wrap(b.text, Math.min(200, W * 0.42) - 20);
      const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 22, bh = lines.length * 17 + 14;
      const bx = Math.max(6, Math.min(W - bw - 6, f.x - bw / 2)), by = Math.max(6, f.y - 150 * f.s - bh);
      ctx.fillStyle = f.me ? "#ff4d00" : "#ffffff"; rr(bx, by, bw, bh, 14); ctx.fill();
      const tx = Math.max(bx + 12, Math.min(bx + bw - 12, f.x));
      ctx.beginPath(); ctx.moveTo(tx - 7, by + bh - 1); ctx.lineTo(tx, by + bh + 9); ctx.lineTo(tx + 7, by + bh - 1); ctx.fill();
      ctx.fillStyle = f.me ? "#ffffff" : "#0c0d0e"; ctx.textAlign = "left";
      lines.forEach((l, i) => ctx.fillText(l, bx + 11, by + 20 + i * 17));
      ctx.restore(); return true;
    };

    const drawStage = () => {
      ctx.fillStyle = "#0c0d0e"; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.font = `${Math.round(Math.min(W * 0.2, 170))}px ${DISPLAY}`; ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fillText("WINTER ARC", W / 2, H * 0.42); ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) { const y = H * (0.5 + i * 0.12); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.fillStyle = "#ff4d00"; ctx.fillRect(0, H * 0.5, W, 3);
    };

    const frame = (now: number) => {
      const dt = Math.min(50, now - last); last = now;
      if (!w.paused) update(now, dt);
      drawStage();
      if (!w.fighters.length) {
        ctx.fillStyle = "#9a9d95"; ctx.font = `600 15px ${BODY}`; ctx.textAlign = "center";
        ctx.fillText("The ring fills up as people accept their invites.", W / 2, H / 2 + 40);
      }
      [...w.fighters].sort((a, b) => a.y - b.y).forEach((f) => drawFighter(f, now));
      w.pops = w.pops.filter((p) => {
        const age = now - p.t0; if (age > 800) return false;
        ctx.save(); ctx.globalAlpha = 1 - age / 800; ctx.textAlign = "center";
        ctx.font = `${p.big ? 34 : 20}px ${DISPLAY}`; ctx.fillStyle = p.big ? "#ff4d00" : "#ffffff";
        ctx.fillText(p.big ? p.text.toUpperCase() : p.text, p.x, p.y - age * 0.05); ctx.restore(); return true;
      });
      w.bubbles = w.bubbles.filter((b) => drawBubble(b, now));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onClick = (e: MouseEvent) => {
      const me = w.fighters.find((f) => f.me); if (!me) return;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const hit = w.fighters.find((f) => f !== me && Math.abs(f.x - x) < 40 * f.s && y < f.y + 24 && y > f.y - 165 * f.s);
      if (hit) start(me, hit, lineFor(me.row, hit.row), performance.now(), true);
    };
    cv.addEventListener("click", onClick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener("click", onClick); };
  }, []);

  const me = rows.find((r) => r.id === meId);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = world.current, t = text.trim();
    if (!t) return;
    const a = w.fighters.find((f) => f.me);
    const b = w.fighters.find((f) => f.id === target);
    const r = await postTaunt(t, target || null);
    if ("error" in r && r.error) { setMsg(r.error); return; }
    setMsg(null); setText("");
    w.mine.push({ text: t.replace(/\s+/g, " ").slice(0, 120), at: Date.now() });
    if (a) { queue(a, b, t); addFeed(a.name, t, true); }
  };

  return (
    <div className="arena">
      <div className="arena-top">
        <h2>The <em>arena</em></h2>
        <p>Everyone who accepted is in here. They brawl, they talk, and your taunts go out to the whole group. Tap a fighter to go after them.</p>
      </div>
      <canvas ref={ref} aria-label="Arena where every participant's fighter brawls and trash-talks" />
      {me && (
        <form className="taunt" onSubmit={send}>
          <input id="taunt" value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="Say something to the group…" autoComplete="off" aria-label="Your taunt" />
          <select id="taunt-target" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Aim it at" style={{ flex: "0 1 11rem", background: "var(--night-2)", color: "#fff", borderColor: "var(--night-line)" }}>
            <option value="">At anyone</option>
            {rows.filter((r) => r.id !== meId).map((r) => <option key={r.id} value={r.id}>At {r.name}</option>)}
          </select>
          <button type="submit">Taunt</button>
          <button type="button" className="ghost" onClick={() => { world.current.paused = !paused; setPaused(!paused); }}>{paused ? "Resume" : "Pause"}</button>
        </form>
      )}
      {msg && <p className="err">{msg}</p>}
      <ul className="feed" aria-label="Trash talk">
        {feed.map((f) => <li key={f.key} className={f.mine ? "mine" : ""}><b>{f.who}:</b> {f.text}</li>)}
      </ul>
    </div>
  );
}
