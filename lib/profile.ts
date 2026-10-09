// The profile questionnaire. Everyone is a friend, so answers are honest and personal.
// Your own answers flavour what your fighter says; your friends use them to roast you.

export const TONES = ["Savage", "Playful", "Dad jokes", "Cold and quiet"] as const;
export type Tone = (typeof TONES)[number];

export const TRAINING_SINCE = ["Not started yet", "Under 6 months", "6 to 12 months", "1 to 3 years", "3+ years"] as const;
export type TrainingSince = (typeof TRAINING_SINCE)[number];

export type Profile = {
  // Gear up checklist, set by the site
  installedAt?: string;
  lockedInAt?: string;
  // About you: honest answers, required
  trainingSince?: TrainingSince;
  toughest?: string;   // "The toughest challenge you've ever faced"
  goal?: string;       // "What do you want to prove this winter?"
  fail?: string;       // "Your most embarrassing workout moment"
  bestRun?: number;    // "Longest you've ever run, in km"
  maxPushups?: number; // "Most push-ups you've done in one go"
  // Your fighter: optional fun
  tone?: Tone;
  excuse?: string;
  weakness?: string;
  song?: string;
  alterEgo?: string;
  move?: string;
  schedule?: "Early bird" | "Night owl";
  rivalId?: string;
};

type TextKey = "toughest" | "goal" | "fail" | "excuse" | "weakness" | "song" | "alterEgo" | "move";

/** Honest questions everyone must answer. */
export const PERSONAL: { key: TextKey; label: string; placeholder: string }[] = [
  { key: "toughest", label: "The toughest challenge you've ever faced", placeholder: "Finishing a 10 km trek with a sprained ankle" },
  { key: "goal", label: "What do you want to prove this winter?", placeholder: "That I can run 10 km without stopping" },
  { key: "fail", label: "Your most embarrassing workout moment", placeholder: "Fell off the treadmill in front of everyone" },
];

/** Fun, optional questions about your fighter. */
export const QUESTIONS: { key: TextKey; label: string; placeholder: string }[] = [
  { key: "alterEgo", label: "Your fighter name or spirit animal", placeholder: "The Kerala Cheetah" },
  { key: "move", label: "Your signature move", placeholder: "Never skipping leg day" },
  { key: "excuse", label: "Your go-to excuse for skipping a workout", placeholder: "It looked like rain" },
  { key: "weakness", label: "The snack or habit you can't quit", placeholder: "Midnight biryani" },
  { key: "song", label: "Your hype song", placeholder: "Eye of the Tiger" },
];

const clip = (v: unknown, n = 60) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");
const num = (v: unknown, max: number) => {
  const n = Number(clip(v));
  return clip(v) !== "" && Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 10) / 10 : undefined;
};

/** Reads the questionnaire out of a submitted form, keeping only known, short answers. */
export function profileFromForm(form: FormData): Profile {
  const p: Profile = {};
  const tone = clip(form.get("tone"));
  if ((TONES as readonly string[]).includes(tone)) p.tone = tone as Tone;
  const since = clip(form.get("trainingSince"));
  if ((TRAINING_SINCE as readonly string[]).includes(since)) p.trainingSince = since as TrainingSince;
  const schedule = clip(form.get("schedule"));
  if (schedule === "Early bird" || schedule === "Night owl") p.schedule = schedule;
  const rival = clip(form.get("rivalId"), 40);
  if (/^[0-9a-f-]{36}$/.test(rival)) p.rivalId = rival;
  for (const q of PERSONAL) { const v = clip(form.get(q.key), 100); if (v) p[q.key] = v; }
  for (const q of QUESTIONS) { const v = clip(form.get(q.key)); if (v) p[q.key] = v; }
  const run = num(form.get("bestRun"), 500); if (run !== undefined) p.bestRun = run;
  const pu = num(form.get("maxPushups"), 2000); if (pu !== undefined) p.maxPushups = Math.round(pu);
  return p;
}

/** The honest questions are required. Returns a message naming what's missing, or null. */
export function missingPersonal(p: Profile): string | null {
  const missing: string[] = [];
  if (!p.trainingSince) missing.push("how long you've been working out");
  for (const q of PERSONAL) if (!p[q.key]) missing.push(q.label.toLowerCase());
  if (p.bestRun === undefined) missing.push("your longest run");
  if (p.maxPushups === undefined) missing.push("your most push-ups");
  return missing.length ? `Please answer: ${missing.join(", ")}.` : null;
}
