"use client";
import { useEffect, useRef, useState } from "react";
import type { BoardRow } from "@/lib/board";
import type { Taunt } from "@/lib/db";
import { postTaunt } from "../actions";
import { trashTalk, comeback as comebackLine, pickTarget, type Talker } from "@/lib/trash.ts";
import { TZ } from "@/lib/season.ts";

// Everyone who accepted brawls in one ring. Fighters trash-talk with their real stats,
// and taunts people type here are shared with the whole group. Everything said, plus new
// results, lands in a timestamped live feed next to the ring.

const JERSEYS = ["#0c0d0e", "#2f6fed", "#1f9d61", "#8a4fff", "#e0a100", "#c2185b", "#4a4d52"];
const QUICK = ["Vidilla machane 💪", "Naale muthal, alle? 😂", "Ninte streak evide?", "Pedikkanda, njan undu", "Ithokke entha!", "Plank-il urangalle"];
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
type Kind = "taunt" | "roast" | "comeback" | "result";
type FeedItem = { key: string; who: string; to: string | null; text: string; mine: boolean; kind: Kind; at: number };
const KIND_LABEL: Record<Kind, string> = { taunt: "Taunt", roast: "Roast", comeback: "Comeback", result: "Result" };
const clock = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

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
  const jerseyFor = (id: string, i: number) => (id === meId ? "#ff4d00" : JERSEYS[i % JERSEYS.length]);
  const world = useRef<{ fighters: Fighter[]; fights: Fight[]; bubbles: Bubble[]; pops: Pop[]; seen: Set<number>; mine: { text: string; at: number }[]; paused: boolean }>(
    { fighters: [], fights: [], bubbles: [], pops: [], seen: new Set(taunts.map((t) => t.id)), mine: [], paused: false },
  );
  const [feed, setFeed] = useState<FeedItem[]>(() =>
    taunts.slice(0, 12).map((t) => ({ key: `t${t.id}`, who: rows.find((r) => r.id === t.participant_id)?.name ?? "Someone", to: rows.find((r) => r.id === t.target_id)?.name ?? null,
      text: t.text, mine: t.participant_id === meId, kind: "taunt", at: Date.parse(t.created_at) })),
  );
  const [text, setText] = useState("");
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const addFeed = (who: string, t: string, mine: boolean, kind: Kind, to: string | null = null) =>
    setFeed((f) => [{ key: `${Date.now()}${Math.random()}`, who, to, text: t, mine, kind, at: Date.now() }, ...f].slice(0, 40));
  const addFeedRef = useRef(addFeed); addFeedRef.current = addFeed;

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

  // New results show up in the feed as they are entered.
  const totals = useRef(new Map(rows.map((r) => [r.id, r.total])));
  useEffect(() => {
    for (const r of rows) {
      const before = totals.current.get(r.id);
      if (before != null && r.total > before) addFeedRef.current(r.name, `scored ${Math.round((r.total - before) * 10) / 10} points. Now on ${r.total}, rank ${r.rank}.`, r.id === meId, "result");
      totals.current.set(r.id, r.total);
    }
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
      addFeedRef.current(a.name, t.text, a.me, "taunt", w.fighters.find((f) => f.id === t.target_id)?.name ?? null);
    }
  }, [taunts, meId]);

  const pending = useRef<{ a: Fighter; b: Fighter | undefined; text: string }[]>([]);
  function queue(a: Fighter, b: Fighter | undefined, text: string) { pending.current.push({ a, b, text }); }

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const w = world.current;
    let W = 0, H = 0, raf = 0, last = performance.now(), lastAuto = 0, lastSay = 0;
    // next/font renames families, so read the real names from the CSS variables.
    const css = getComputedStyle(document.documentElement);
    const DISPLAY = (css.getPropertyValue("--font-display").trim() || "Anton") + ", Impact, sans-serif";
    const BODY = (css.getPropertyValue("--font-body").trim() || "Archivo") + ", Arial, sans-serif";

    const layout = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(1, w.fighters.length);
      const perRow = Math.min(n, W < 520 ? 3 : W < 760 ? 4 : 8);
      w.fighters.forEach((f, i) => {
        const rowI = Math.floor(i / perRow), col = i % perRow, cols = Math.min(perRow, n - rowI * perRow);
        // Back rows sit half a column over so faces peek between the front row.
        const span = perRow === 1 ? 0 : 0.7 / (perRow - 1);
        let slot = col + (perRow - cols) / 2;
        if (rowI % 2 && Number.isInteger(slot)) slot += slot + 0.5 > perRow - 1 ? -0.5 : 0.5;
        f.s = Math.max(0.6, Math.min(1.2, W / 850)) * (rowI ? 0.85 : 1);
        f.homeX = W * (perRow === 1 ? 0.5 : Math.max(0.1, Math.min(0.9, 0.15 + span * slot)));
        f.homeY = H - 34 - rowI * Math.max(H * 0.2, 118 * f.s) - (col % 2) * 10;
        if (Number.isNaN(f.x)) { f.x = f.homeX; f.y = f.homeY; f.face = f.homeX < W / 2 ? 1 : -1; }
      });
    };
    layout();
    const ro = new ResizeObserver(layout); ro.observe(cv);

    const say = (f: Fighter, text: string, now: number) => { lastSay = now; w.bubbles = w.bubbles.filter((b) => b.f !== f).slice(-1); w.bubbles.push({ f, text, t0: now }); };
    const start = (a: Fighter, b: Fighter, text: string, now: number, toFeed: boolean) => {
      if (a.busy || b.busy || a === b) return false;
      a.busy = b.busy = true; a.state = "walk"; a.face = b.x > a.x ? 1 : -1;
      w.fights.push({ a, b, step: "walk", t0: now });
      say(a, text, now);
      if (toFeed) addFeedRef.current(a.name, text, a.me, "roast", b.name);
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
          { const back = comeback(b.row, a.row); say(b, back, now); addFeedRef.current(b.name, back, b.me, "comeback", a.name); }
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
      if (!reduce && free.length >= 2 && w.fights.length < 1 && w.bubbles.length < 2 && now - lastSay > 3500 && now - lastAuto > 4000) {
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
      ctx.fillStyle = "rgba(12,13,14,.12)"; ctx.beginPath(); ctx.ellipse(0, 0, 34 * s, 7 * s, 0, 0, 7); ctx.fill();
      ctx.scale(s, s); ctx.translate(0, bob); ctx.rotate(lean);
      const pants = "#26272a", hip = -46, sh = -92, step = f.state === "walk" ? Math.sin(t * 12) * 14 : 0;
      limb(-7, hip, -10 - step, -4, 12, pants); limb(7, hip, 10 + step, -4, 12, pants);
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#0c0d0e"; ctx.lineWidth = 1.4;
      rr(-19 - step, -8, 18, 9, 4); ctx.fill(); ctx.stroke(); rr(1 + step, -8, 18, 9, 4); ctx.fill(); ctx.stroke();
      // torso
      ctx.fillStyle = f.jersey; rr(-21, sh - 4, 42, hip - sh + 12, 13); ctx.fill();
      ctx.fillStyle = f.me ? "#0c0d0e" : "#ff4d00"; ctx.fillRect(-21, sh + 22, 42, 5);
      ctx.fillStyle = "#ffffff";
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
      ctx.fillStyle = f.me ? "#ff4d00" : "#ffffff"; ctx.strokeStyle = "#0c0d0e"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-21, hy - 5); ctx.quadraticCurveTo(0, hy - 38, 21, hy - 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = f.me ? "#0c0d0e" : "#ff4d00"; rr(-22, hy - 10, 44, 8, 4); ctx.fill();
      ctx.beginPath(); ctx.arc(0, hy - 30, 6, 0, 7); ctx.fill();
      ctx.restore();
      // name tag + hp
      const ny = f.y + 22, fs = Math.round(12 * Math.max(0.9, s));
      ctx.font = `800 ${fs}px ${BODY}`; ctx.textAlign = "center";
      const label = f.me ? `${f.name} (you)` : f.name, tw = ctx.measureText(label).width + 14;
      ctx.fillStyle = f.me ? "#ff4d00" : "#ffffff"; rr(f.x - tw / 2, ny - fs, tw, fs + 6, 99); ctx.fill();
      if (!f.me) { ctx.strokeStyle = "#d6d8d0"; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.fillStyle = f.me ? "#ffffff" : "#0c0d0e"; ctx.fillText(label, f.x, ny);
      const bw = 50 * s; ctx.fillStyle = "#e1e3dc"; ctx.fillRect(f.x - bw / 2, ny + 7, bw, 4);
      ctx.fillStyle = f.hp > 40 ? "#0c0d0e" : "#ff4d00"; ctx.fillRect(f.x - bw / 2, ny + 7, (bw * f.hp) / 100, 4);
    };

    const wrap = (txt: string, maxW: number) => {
      const out: string[] = []; let cur = "";
      for (const word of txt.split(" ")) { const t2 = cur ? cur + " " + word : word; if (ctx.measureText(t2).width > maxW && cur) { out.push(cur); cur = word; } else cur = t2; }
      if (cur) out.push(cur); return out.slice(0, 6);
    };
    const drawBubble = (b: Bubble, now: number) => {
      // Long enough to read: about 4.5 s for a short line, up to 8 s for a long one.
      const age = now - b.t0, dur = Math.min(8000, 4000 + b.text.length * 45);
      if (age > dur) return false;
      const f = b.f;
      ctx.save(); ctx.globalAlpha = Math.min(1, age / 120, (dur - age) / 250);
      ctx.font = `700 13px ${BODY}`;
      const lines = wrap(b.text, (W < 520 ? Math.min(250, W * 0.66) : Math.min(220, W * 0.44)) - 20);
      const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 22, bh = lines.length * 17 + 14;
      const bx = Math.max(6, Math.min(W - bw - 6, f.x - bw / 2)), by = Math.max(6, f.y - 150 * f.s - bh);
      const tx = Math.max(bx + 12, Math.min(bx + bw - 12, f.x));
      ctx.fillStyle = f.me ? "#ff4d00" : "#ffffff"; ctx.strokeStyle = f.me ? "#ff4d00" : "#0c0d0e"; ctx.lineWidth = 2; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(tx - 7, by + bh); ctx.lineTo(tx, by + bh + 9); ctx.lineTo(tx + 7, by + bh); ctx.closePath(); ctx.fill(); ctx.stroke();
      rr(bx, by, bw, bh, 14); ctx.fill(); ctx.stroke();
      ctx.fillRect(tx - 6, by + bh - 3, 12, 3);
      ctx.fillStyle = f.me ? "#ffffff" : "#0c0d0e"; ctx.textAlign = "left";
      lines.forEach((l, i) => ctx.fillText(l, bx + 11, by + 20 + i * 17));
      ctx.restore(); return true;
    };

    const drawStage = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.font = `${Math.round(Math.min(W * 0.2, 170))}px ${DISPLAY}`; ctx.textAlign = "center";
      ctx.fillStyle = "rgba(12,13,14,.045)"; ctx.fillText("WINTER ARC", W / 2, H * 0.42); ctx.restore();
      ctx.strokeStyle = "rgba(12,13,14,.1)"; ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) { const y = H * (0.5 + i * 0.12); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.fillStyle = "#ff4d00"; ctx.fillRect(0, H * 0.5, W, 3);
    };

    const frame = (now: number) => {
      const dt = Math.min(50, now - last); last = now;
      if (!w.paused) update(now, dt);
      drawStage();
      if (!w.fighters.length) {
        ctx.fillStyle = "#6b6f68"; ctx.font = `600 15px ${BODY}`; ctx.textAlign = "center";
        ctx.fillText("The ring fills up as people accept their invites.", W / 2, H / 2 + 40);
      }
      [...w.fighters].sort((a, b) => a.y - b.y).forEach((f) => drawFighter(f, now));
      w.pops = w.pops.filter((p) => {
        const age = now - p.t0; if (age > 800) return false;
        ctx.save(); ctx.globalAlpha = 1 - age / 800; ctx.textAlign = "center";
        ctx.font = `${p.big ? 34 : 20}px ${DISPLAY}`; ctx.fillStyle = p.big ? "#ff4d00" : "#0c0d0e";
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
    if (a) { queue(a, b, t); addFeed(a.name, t, true, "taunt", b?.name ?? null); }
  };

  const others = rows.map((r, i) => ({ r, color: jerseyFor(r.id, i) })).filter((o) => o.r.id !== meId);
  return (
    <div className="arena">
      <div className="arena-top">
        <h2>The <em>arena</em></h2>
        <p>Everyone who accepted is in the ring. They brawl, they talk, and your taunts go out to the whole group.</p>
      </div>
      <div className="arena-grid">
        <div className="ring">
          <span className="live">The ring · {rows.length} in</span>
          <canvas ref={ref} aria-label="Arena where every participant's fighter brawls and trash-talks" />
          {me && <p className="hint">Tap a fighter to go after them.</p>}
        </div>
        <div className="blog-wrap">
          <h3>Live feed<button type="button" className="ghost small" onClick={() => { world.current.paused = !paused; setPaused(!paused); }}>{paused ? "Resume ring" : "Pause ring"}</button></h3>
          <ol className="blog" aria-label="Trash talk and results">
            {feed.length === 0 && <li className="empty">Quiet so far. Start something.</li>}
            {feed.map((f) => (
              <li key={f.key} className={f.mine ? "mine" : ""}>
                <time>{clock.format(f.at)}</time>
                <p><span className={`kind ${f.kind}`}>{KIND_LABEL[f.kind]}</span>
                  {f.kind === "result" ? <><b>{f.who}</b> {f.text}</> : <><b>{f.who}</b>{f.to ? <> to {f.to}</> : null}: {f.text}</>}
                </p>
              </li>
            ))}
          </ol>
          {me && (
            <form className="taunt" onSubmit={send}>
              <div className="aim" role="group" aria-label="Aim it at">
                <button type="button" aria-pressed={target === ""} onClick={() => setTarget("")}><span className="av" style={{ background: "#6b6f68" }}>All</span><span>Everyone</span></button>
                {others.map(({ r, color }) => (
                  <button key={r.id} type="button" aria-pressed={target === r.id} onClick={() => setTarget(r.id)}><span className="av" style={{ background: color }}>{r.name.slice(0, 1).toUpperCase()}</span><span>{r.name.split(" ")[0]}</span></button>
                ))}
              </div>
              <div className="quick">
                {QUICK.map((q) => <button key={q} type="button" onClick={() => { setText(q); document.getElementById("taunt")?.focus(); }}>{q}</button>)}
              </div>
              <div className="send">
                <input id="taunt" value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="Post to the feed…" autoComplete="off" aria-label="Your taunt" />
                <button type="submit">Post</button>
              </div>
              {msg && <p className="err">{msg}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
