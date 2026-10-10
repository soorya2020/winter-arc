/* The one place colours live. Every page, the arena canvas, emails and the poster read from
   here, so a new look means editing values in this file and nothing else.
   To switch theme: change ACTIVE below (or set NEXT_PUBLIC_THEME on a preview deploy). */

export type Palette = {
  paper: string; // page background
  ink: string; // main text, rules, dark buttons
  onInk: string; // text sitting on an ink background
  accent: string; // the one loud colour: highlights, "you", CTAs
  onAccent: string; // text sitting on an accent background
  accentSoft: string; // pale accent wash for done/selected cards
  muted: string; // secondary text
  line: string; // hairlines and borders
  surface: string; // cards, inputs, sheets
  track: string; // empty bars, quiet panels
  night: string; // the dark arena / RSVP block
  night2: string; // raised panels on night
  nightLine: string; // borders on night
  nightMuted: string; // secondary text on night
  bad: string; // errors
  good: string; // "result" badges
  stamp: string; // rubber "rejected" stamp on light
  stampNight: string; // same stamp on dark
  slate: string; // neutral badge / tool grey
  frost: string; // snowflake outline
  jerseys: string[]; // other people's colours (you always wear accent)
};

const blaze: Palette = {
  paper: "#f4f5f1", ink: "#0c0d0e", onInk: "#ffffff", accent: "#ff4d00", onAccent: "#ffffff", accentSoft: "#fff6f1",
  muted: "#6b6f68", line: "#d6d8d0", surface: "#ffffff", track: "#e1e3dc",
  night: "#0c0d0e", night2: "#1a1b18", nightLine: "#33352f", nightMuted: "#9a9d95",
  bad: "#c62a1f", good: "#1f9d61", stamp: "#d4170f", stampNight: "#ff3b30", slate: "#4a4d52", frost: "#2f6fed",
  jerseys: ["#0c0d0e", "#2f6fed", "#1f9d61", "#8a4fff", "#e0a100", "#c2185b", "#4a4d52"],
};

const glacier: Palette = {
  paper: "#eef3f8", ink: "#0a1a2f", onInk: "#ffffff", accent: "#1d6bff", onAccent: "#ffffff", accentSoft: "#eef4ff",
  muted: "#5d6b7c", line: "#cfd9e5", surface: "#ffffff", track: "#dce5ef",
  night: "#0a1a2f", night2: "#13263f", nightLine: "#2a3d57", nightMuted: "#93a3b8",
  bad: "#d1293d", good: "#14946b", stamp: "#d1293d", stampNight: "#ff5a6a", slate: "#4b5a6d", frost: "#1d6bff",
  jerseys: ["#0a1a2f", "#00a6c8", "#14946b", "#7b5cff", "#e09a00", "#d6336c", "#4b5a6d"],
};

const volt: Palette = {
  paper: "#0e0f11", ink: "#f2f3ee", onInk: "#0e0f11", accent: "#c8ff1a", onAccent: "#0e0f11", accentSoft: "#1d2410",
  muted: "#9a9e96", line: "#2c2e31", surface: "#17181b", track: "#232528",
  night: "#000000", night2: "#141516", nightLine: "#2c2e31", nightMuted: "#9a9e96",
  bad: "#ff5a4f", good: "#3ddc84", stamp: "#ff4b3e", stampNight: "#ff4b3e", slate: "#5a5e64", frost: "#c8ff1a",
  jerseys: ["#3a3d42", "#4d8dff", "#3ddc84", "#a77bff", "#ffb020", "#ff4f9a", "#8a8e95"],
};

const crimson: Palette = {
  paper: "#f6f1ea", ink: "#1a1412", onInk: "#ffffff", accent: "#c8102e", onAccent: "#ffffff", accentSoft: "#fbeeee",
  muted: "#74685f", line: "#e0d6ca", surface: "#ffffff", track: "#ebe2d7",
  night: "#1a1412", night2: "#2a201c", nightLine: "#3f332d", nightMuted: "#a8998d",
  bad: "#b3261e", good: "#2e7d4f", stamp: "#a50d25", stampNight: "#ff4d5e", slate: "#5c524b", frost: "#3b6ea8",
  jerseys: ["#1a1412", "#2f5fa8", "#2e7d4f", "#7b4fa8", "#d08a00", "#d4557a", "#5c524b"],
};

export const themes = { blaze, glacier, volt, crimson };
export type ThemeName = keyof typeof themes;

const ACTIVE: ThemeName = "blaze";

const fromEnv = process.env.NEXT_PUBLIC_THEME as ThemeName | undefined;
export const themeName: ThemeName = fromEnv && fromEnv in themes ? fromEnv : ACTIVE;
export const palette: Palette = themes[themeName];

/** WhatsApp's own greens. Brand colours, so they stay the same in every theme. */
export const whatsapp = { green: "#1fa855", dark: "#168a45", deep: "#12753a" };

/** The cartoon athletes (arena, organiser avatars). Character art, so it stays the same in every theme;
    their jerseys and beanies are what pick up the theme. */
export const figure = { line: "#0c0d0e", pants: "#26272a", shoe: "#ffffff", number: "#ffffff", skin: "#c68a5a", sweat: "#5ab4ff",
  skins: ["#e5b48f", "#c98b62", "#a8714a", "#8d5a3b", "#d6a27c", "#f0c9a5"] };

/** "#ff4d00" + .5 → "rgba(255, 77, 0, 0.5)" for canvas and inline styles. */
export function alpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
const rgb = (hex: string) => alpha(hex, 1).slice(5, -4).replace(/,/g, "");

/** The CSS custom properties globals.css uses, injected once in the root layout. */
export function themeCss(p: Palette = palette) {
  const v: Record<string, string> = {
    paper: p.paper, ink: p.ink, "on-ink": p.onInk, accent: p.accent, "on-accent": p.onAccent, "accent-soft": p.accentSoft,
    muted: p.muted, line: p.line, surface: p.surface, track: p.track,
    night: p.night, "night-2": p.night2, "night-line": p.nightLine, "night-muted": p.nightMuted,
    bad: p.bad, good: p.good, stamp: p.stamp, "stamp-night": p.stampNight, slate: p.slate,
    wa: whatsapp.green, "wa-dark": whatsapp.dark, "wa-deep": whatsapp.deep,
    "accent-rgb": rgb(p.accent), "on-ink-rgb": rgb(p.onInk), "ink-rgb": rgb(p.ink), "paper-rgb": rgb(p.paper), "night-rgb": rgb(p.night),
    "surface-rgb": rgb(p.surface), "frost-rgb": rgb(p.frost),
  };
  const dark = parseInt(p.paper.slice(1, 3), 16) < 80;
  return `:root{${Object.entries(v).map(([k, c]) => `--${k}:${c};`).join("")}color-scheme:${dark ? "dark" : "light"};}`;
}
